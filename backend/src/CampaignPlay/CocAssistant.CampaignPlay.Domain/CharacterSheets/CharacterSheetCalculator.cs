namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>A point budget (sections 7.1 and 8): the budget, the points spent, and the points left.</summary>
public sealed record PointBudget(int Budget, int Spent, int Left)
{
    public static PointBudget? For(int? budget, int spent) => budget is { } value ? new PointBudget(value, spent, value - spent) : null;
}

/// <summary>Values derived from characteristics, age, and skills (sections 5, 7, 8, and 11); each is null until it can be calculated.</summary>
public sealed record DerivedValues(
    int? Luck,
    int? HitPoints,
    int? MagicPoints,
    int? SanityCurrent,
    int? SanityMaximum,
    int? Dodge,
    int? MovementRate,
    string? DamageBonus,
    int? Build,
    PointBudget? OccupationPoints = null,
    PointBudget? PersonalInterestPoints = null,
    int? CreditRating = null,
    WealthValues? Wealth = null)
{
    public static readonly DerivedValues NotCalculated = new(null, null, null, null, null, null, null, null, null);
}

/// <summary>What the system computes for a Character Sheet; never stored and never accepted from the client.</summary>
public sealed record CharacterSheetComputation(
    AgeBracket? Bracket,
    CharacteristicValues FinalCharacteristics,
    IReadOnlyList<EduImprovementOutcome> EduImprovementOutcomes,
    DerivedValues Derived)
{
    /// <summary>The characteristics before age effects: assigned (Point Buy, Quick Fire) or rolled (Standard Rolling).</summary>
    public CharacteristicValues AssignedCharacteristics { get; init; } = CharacteristicValues.Empty;

    public ResolvedOccupation? Occupation { get; init; }

    /// <summary>The Quick Fire skill that takes the value Credit Rating frees (section 18 assumption), if any.</summary>
    public SkillReference? QuickFireExtraSkill { get; init; }

    public IReadOnlyList<SkillRow> Skills { get; init; } = [];

    /// <summary>Regular, Hard, and Extreme values after age effects (section 4), or null when not calculable.</summary>
    public CharacteristicLevels? LevelsOf(Characteristic characteristic) =>
        FinalCharacteristics[characteristic] is { } value ? CharacteristicLevels.For(value) : null;

    public SkillRow? SkillRowOf(SkillReference skill) => Skills.FirstOrDefault(row => row.Skill.Equals(skill));
}

/// <summary>
/// Applies age effects in the order of docs/game-rules/coc7_character_creation_and_development_rules.md section 3.3
/// (physical deduction, APP modifier, EDU improvement checks), derives the section 4 and 5 values, then the occupation
/// and personal interest budgets (sections 7.1 and 8), the skills (section 9), Credit Rating, and wealth (section 11).
/// </summary>
public sealed class CharacterSheetCalculator
{
    private readonly CreationRuleSet _rules;

    public CharacterSheetCalculator(CreationRuleSet rules)
    {
        _rules = rules;
    }

    /// <summary>The applicable bracket, only for an age the project allows (project_ruleset.md section 4.1).</summary>
    public AgeBracket? BracketFor(InvestigatorIdentity identity) =>
        identity.Age is { } age && InvestigatorAgeRange.Contains(age) ? _rules.AgeRules.BracketFor(age) : null;

    /// <summary>The characteristics before age effects: rolled under Standard Rolling (section 2.1), otherwise assigned.</summary>
    public static CharacteristicValues AssignedValuesOf(CharacterSheet sheet) =>
        sheet.CreationMethod == CreationMethod.StandardRolling
            ? StandardRolling.ValuesFrom(sheet.CharacteristicRolls)
            : sheet.AssignedCharacteristics;

    public CharacterSheetComputation Calculate(CharacterSheet sheet)
    {
        var assigned = AssignedValuesOf(sheet);
        var bracket = BracketFor(sheet.Identity);
        var characteristics = bracket is null
            ? new CharacterSheetComputation(null, CharacteristicValues.Empty, [], DerivedValues.NotCalculated)
            : CalculateCharacteristics(sheet, assigned, bracket);

        return WithSkills(characteristics with { AssignedCharacteristics = assigned }, sheet);
    }

    private CharacterSheetComputation CalculateCharacteristics(CharacterSheet sheet, CharacteristicValues assigned, AgeBracket bracket)
    {
        var requiredChecks = sheet.EduImprovementChecks.Take(bracket.EduImprovementChecks).ToList();
        var eduOutcomes = assigned[Characteristic.Education] is { } education
            ? EduImprovement.Evaluate(education, requiredChecks)
            : [];

        var final = CharacteristicValues.From(CharacteristicCodes.All.Select(characteristic =>
            KeyValuePair.Create(characteristic, FinalValue(characteristic, assigned, sheet.AgeDeductions, bracket, eduOutcomes))));

        return new CharacterSheetComputation(bracket, final, eduOutcomes, Derive(final, sheet, bracket));
    }

    private CharacterSheetComputation WithSkills(CharacterSheetComputation computation, CharacterSheet sheet)
    {
        var occupation = OccupationResolution.Resolve(sheet.Occupation, _rules.Occupations);
        var extraSkill = QuickFireExtraSkillOf(sheet, occupation);
        var occupationSkills = (occupation?.OccupationSkills ?? []).Concat(extraSkill is null ? [] : [extraSkill]).ToList();
        var skills = SkillPostProcessing.Compute(sheet, computation.FinalCharacteristics, occupationSkills, _rules);
        var creditRating = skills.First(row => row.Skill.Equals(SkillReference.CreditRating)).Value;

        var derived = computation.Derived with
        {
            OccupationPoints = OccupationBudget(sheet, occupation, computation.FinalCharacteristics),
            PersonalInterestPoints = PersonalInterestBudget(sheet, computation.FinalCharacteristics),
            CreditRating = creditRating,
            Wealth = creditRating is { } value ? Wealth.For(value, _rules.Wealth) : null,
        };

        return computation with { Occupation = occupation, QuickFireExtraSkill = extraSkill, Skills = skills, Derived = derived };
    }

    // Section 18 assumption: when Credit Rating frees a value, the first other skill outside the occupation takes it.
    private static SkillReference? QuickFireExtraSkillOf(CharacterSheet sheet, ResolvedOccupation? occupation)
    {
        if (sheet.CreationMethod != CreationMethod.QuickFire || occupation?.CreditRatingMin is not { } minimum
            || QuickFireRules.CreditRatingFor(minimum).FreedValue is null)
        {
            return null;
        }

        return sheet.QuickFire.Values
            .Select(value => value.Skill)
            .FirstOrDefault(skill => !skill.Equals(SkillReference.CreditRating) && !occupation.IsOccupationSkill(skill));
    }

    private static PointBudget? OccupationBudget(CharacterSheet sheet, ResolvedOccupation? occupation, CharacteristicValues final)
    {
        if (sheet.CreationMethod == CreationMethod.QuickFire || occupation?.Formula is not { } formula)
        {
            return null;
        }

        var budget = OccupationPoints.Budget(formula, sheet.Occupation!.FormulaCharacteristics, final);
        return PointBudget.For(budget, sheet.SkillAllocations.Sum(allocation => allocation.OccupationPoints ?? 0));
    }

    private static PointBudget? PersonalInterestBudget(CharacterSheet sheet, CharacteristicValues final) =>
        sheet.CreationMethod == CreationMethod.QuickFire
            ? null
            : PointBudget.For(PersonalInterestPoints.Budget(final), sheet.SkillAllocations.Sum(allocation => allocation.PersonalInterestPoints ?? 0));

    // Section 3.3: physical deduction, then the APP modifier, then EDU improvement.
    private static int? FinalValue(
        Characteristic characteristic,
        CharacteristicValues assignedValues,
        CharacteristicValues deductions,
        AgeBracket bracket,
        IReadOnlyList<EduImprovementOutcome> eduOutcomes)
    {
        if (assignedValues[characteristic] is not { } assigned)
        {
            return null;
        }

        var deduction = bracket.AllowsDeductionFrom(characteristic) ? deductions[characteristic] ?? 0 : 0;
        return characteristic switch
        {
            Characteristic.Appearance => assigned - deduction + bracket.AppearanceModifier,
            Characteristic.Education => eduOutcomes.Count > 0 ? eduOutcomes[^1].EduAfter : assigned,
            _ => assigned - deduction,
        };
    }

    private DerivedValues Derive(CharacteristicValues final, CharacterSheet sheet, AgeBracket bracket)
    {
        var strength = final[Characteristic.Strength];
        var constitution = final[Characteristic.Constitution];
        var dexterity = final[Characteristic.Dexterity];
        var power = final[Characteristic.Power];
        var size = final[Characteristic.Size];
        var sanity = power is { } p ? StartingSanity.For(p) : ((int, int)?)null;
        var damageBonusAndBuild = strength is { } s && size is { } z ? DamageBonusAndBuild.For(s + z, _rules.CharacteristicsRules) : null;
        var movementRate = strength is { } ms && dexterity is { } md && size is { } mz
            ? MovementRate.For(ms, md, mz, sheet.Identity.Age!.Value)
            : (int?)null;

        return new DerivedValues(
            LuckValue.Calculate(bracket, sheet.LuckRolls),
            constitution is { } c && size is { } hz ? HitPoints.For(c, hz) : null,
            power is { } mp ? MagicPoints.For(mp) : null,
            sanity?.Item1,
            sanity?.Item2,
            dexterity is { } d ? DodgeBase.For(d) : null,
            movementRate,
            damageBonusAndBuild?.DamageBonus,
            damageBonusAndBuild?.Build);
    }
}
