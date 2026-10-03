namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Values derived from characteristics and age (section 5); each is null until it can be calculated.</summary>
public sealed record DerivedValues(
    int? Luck,
    int? HitPoints,
    int? MagicPoints,
    int? SanityCurrent,
    int? SanityMaximum,
    int? Dodge,
    int? MovementRate,
    string? DamageBonus,
    int? Build)
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
    /// <summary>Regular, Hard, and Extreme values after age effects (section 4), or null when not calculable.</summary>
    public CharacteristicLevels? LevelsOf(Characteristic characteristic) =>
        FinalCharacteristics[characteristic] is { } value ? CharacteristicLevels.For(value) : null;
}

/// <summary>
/// Applies age effects in the order of docs/game-rules/coc7_character_creation_and_development_rules.md section 3.3
/// (physical deduction, APP modifier, EDU improvement checks) and then derives the section 4 and 5 values.
/// </summary>
public sealed class CharacterSheetCalculator
{
    private readonly AgeRules _ageRules;
    private readonly CharacteristicsRules _characteristicsRules;

    public CharacterSheetCalculator(AgeRules ageRules, CharacteristicsRules characteristicsRules)
    {
        _ageRules = ageRules;
        _characteristicsRules = characteristicsRules;
    }

    /// <summary>The applicable bracket, only for an age the project allows (project_ruleset.md section 4.1).</summary>
    public AgeBracket? BracketFor(InvestigatorIdentity identity) =>
        identity.Age is { } age && InvestigatorAgeRange.Contains(age) ? _ageRules.BracketFor(age) : null;

    public CharacterSheetComputation Calculate(CharacterSheet sheet)
    {
        var bracket = BracketFor(sheet.Identity);
        if (bracket is null)
        {
            return new CharacterSheetComputation(null, CharacteristicValues.Empty, [], DerivedValues.NotCalculated);
        }

        var assigned = sheet.AssignedCharacteristics;
        var requiredChecks = sheet.EduImprovementChecks.Take(bracket.EduImprovementChecks).ToList();
        var eduOutcomes = assigned[Characteristic.Education] is { } education
            ? EduImprovement.Evaluate(education, requiredChecks)
            : [];

        var final = CharacteristicValues.From(CharacteristicCodes.All.Select(characteristic =>
            KeyValuePair.Create(characteristic, FinalValue(characteristic, sheet, bracket, eduOutcomes))));

        return new CharacterSheetComputation(bracket, final, eduOutcomes, Derive(final, sheet, bracket));
    }

    // Section 3.3: physical deduction, then the APP modifier, then EDU improvement.
    private static int? FinalValue(
        Characteristic characteristic,
        CharacterSheet sheet,
        AgeBracket bracket,
        IReadOnlyList<EduImprovementOutcome> eduOutcomes)
    {
        if (sheet.AssignedCharacteristics[characteristic] is not { } assigned)
        {
            return null;
        }

        var deduction = bracket.AllowsDeductionFrom(characteristic) ? sheet.AgeDeductions[characteristic] ?? 0 : 0;
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
        var damageBonusAndBuild = strength is { } s && size is { } z ? DamageBonusAndBuild.For(s + z, _characteristicsRules) : null;
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
