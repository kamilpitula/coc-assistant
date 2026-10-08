namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Maps Character Sheet requests to domain inputs and computed views to responses.</summary>
public static class CharacterSheetWireFormat
{
    public static readonly RulesResponse Rules = new(
        PointBuyRules.Budget,
        PointBuyRules.Minimum,
        PointBuyRules.Maximum,
        PointBuyRules.RecommendedMinimum,
        InvestigatorAgeRange.Minimum,
        InvestigatorAgeRange.Maximum,
        CharacteristicFloor.Value,
        CreationDice.Luck.ToString(),
        CreationDice.EduImprovementCheck.ToString(),
        CreationDice.EduImprovementGain.ToString(),
        EduImprovement.MaximumEducation,
        CreationDice.LuckMultiplier,
        CharacteristicCodes.All.ToDictionary(
            characteristic => characteristic.ToCode(),
            characteristic => ToFormula(StandardRolling.FormulaFor(characteristic))),
        QuickFireRules.CharacteristicValues,
        QuickFireRules.SkillValues,
        QuickFireRules.PersonalInterestBonus,
        QuickFireRules.PersonalInterestCount,
        OccupationPointFormulas.Common
            .Select(formula => new OccupationPointFormulaOptionResponse(OccupationPointFormulas.IdOf(formula), ToTerms(formula)))
            .ToList(),
        CustomOccupationRules.SkillCount,
        CreditRatingRange.Minimum,
        CreditRatingRange.Maximum,
        SkillValueWarning.Threshold,
        SkillReference.CreditRatingName,
        SkillReference.CthulhuMythosName);

    public static CharacterSheetInputs ToInputs(CharacterSheetRequest request) =>
        new(
            new InvestigatorIdentity(
                request.Identity.Name,
                request.Identity.Age,
                request.Identity.Gender,
                request.Identity.Residence,
                request.Identity.Birthplace),
            request.CreationMethod is null ? null : Enum.Parse<CreationMethod>(request.CreationMethod),
            ToValues(request.Characteristics),
            ToValues(request.AgeEffects?.Deductions),
            (request.AgeEffects?.EduImprovementChecks ?? [])
                .Select(check => new EduImprovementCheckInput(check.Check, check.Gain))
                .ToList(),
            request.LuckRolls ?? [],
            ToValues(request.CharacteristicRolls),
            request.Occupation is null ? null : ToOccupation(request.Occupation),
            (request.Skills ?? [])
                .Select(skill => new SkillAllocation(ToSkill(skill.Skill, skill.Specialization), skill.OccupationPoints, skill.PersonalInterestPoints))
                .ToList(),
            ToQuickFire(request.QuickFire));

    /// <summary>A skill as the Player named it, trimmed, with a blank specialization read as none.</summary>
    public static SkillReference ToSkill(string skill, string? specialization) =>
        new(skill.Trim(), string.IsNullOrWhiteSpace(specialization) ? null : specialization.Trim());

    public static InvestigatorSummaryResponse ToSummary(Investigator investigator) =>
        new(
            investigator.Id,
            investigator.Status.ToString(),
            investigator.CharacterSheet.Identity.Name,
            investigator.ChangeRequestComment,
            investigator.UpdatedAt);

    public static CharacterSheetResponse ToCharacterSheetResponse(CharacterSheetView view) =>
        new(
            view.Investigator.Id,
            view.Investigator.Status.ToString(),
            view.PlayerName,
            view.Investigator.ChangeRequestComment,
            ToViewResponse(view),
            Rules,
            view.ValidationErrors.Select(ToResponse).ToList());

    public static KeeperInvestigatorResponse ToKeeperResponse(CharacterSheetView view) =>
        new(
            view.Investigator.Id,
            view.Investigator.Status.ToString(),
            view.PlayerName,
            view.Investigator.ChangeRequestComment,
            view.Investigator.UpdatedAt,
            ToViewResponse(view),
            view.ValidationErrors.Where(error => error.Severity == ValidationSeverity.Warning).Select(ToResponse).ToList());

    public static InvestigatorListItemResponse ToListItem(InvestigatorListItem item)
    {
        var visible = item.Investigator.IsVisibleToKeeper;
        return new InvestigatorListItemResponse(
            item.Investigator.PlayerAccountId,
            item.PlayerName,
            item.Investigator.Status.ToString(),
            visible ? item.Investigator.Id : null,
            visible ? item.Investigator.CharacterSheet.Identity.Name : null,
            item.Investigator.UpdatedAt);
    }

    public static ValidationErrorResponse ToResponse(ValidationError error) =>
        new(error.Code, error.Field, error.Message, error.Expected, error.Actual, error.Severity.ToString());

    private static CharacterSheetViewResponse ToViewResponse(CharacterSheetView view)
    {
        var sheet = view.Investigator.CharacterSheet;
        var computation = view.Computation;
        return new CharacterSheetViewResponse(
            CharacterSheet.CurrentSchemaVersion,
            new IdentityResponse(sheet.Identity.Name, sheet.Identity.Age, sheet.Identity.Gender, sheet.Identity.Residence, sheet.Identity.Birthplace),
            sheet.CreationMethod?.ToString(),
            CharacteristicCodes.All.ToDictionary(characteristic => characteristic.ToCode(), characteristic => ToCharacteristic(characteristic, computation)),
            CharacteristicCodes.All.ToDictionary(characteristic => characteristic.ToCode(), characteristic => sheet.CharacteristicRolls[characteristic]),
            ToAgeEffects(sheet, computation),
            sheet.LuckRolls,
            sheet.Occupation is null ? null : ToOccupationView(sheet.Occupation, computation.Occupation),
            computation.Skills.Select(ToSkillRow).ToList(),
            new QuickFireResponse(
                sheet.QuickFire.Values.Select(value => new QuickFireValueResponse(value.Skill.Skill, value.Skill.Specialization, value.Value)).ToList(),
                sheet.QuickFire.PersonalInterests.Select(ToSkillResponse).ToList(),
                sheet.QuickFire.ExtraSkill is null ? null : ToSkillResponse(sheet.QuickFire.ExtraSkill)),
            ToDerived(computation.Derived),
            sheet.RollRecords.Select(record => new RollRecordResponse(record.Purpose, record.Dice, record.Result, record.Source.ToString())).ToList());
    }

    private static CharacteristicResponse ToCharacteristic(Characteristic characteristic, CharacterSheetComputation computation)
    {
        var levels = computation.LevelsOf(characteristic);
        return new CharacteristicResponse(computation.AssignedCharacteristics[characteristic], levels?.Regular, levels?.Hard, levels?.Extreme);
    }

    private static AgeEffectsResponse ToAgeEffects(CharacterSheet sheet, CharacterSheetComputation computation)
    {
        var bracket = computation.Bracket is { } found
            ? new AgeBracketResponse(
                found.MinimumAge,
                found.MaximumAge,
                found.PhysicalDeductionTotal,
                found.PhysicalDeductionCharacteristics.Select(characteristic => characteristic.ToCode()).ToList(),
                found.AppearanceModifier,
                found.EduImprovementChecks,
                found.LuckRolls)
            : null;

        var checks = sheet.EduImprovementChecks
            .Select((check, index) => (check, outcome: computation.EduImprovementOutcomes.ElementAtOrDefault(index)))
            .Select(pair => new EduImprovementCheckResponse(pair.check.Check, pair.check.Gain, pair.outcome?.EduBefore, pair.outcome?.EduAfter))
            .ToList();

        var deductions = sheet.AgeDeductions.Present.ToDictionary(characteristic => characteristic.ToCode(), characteristic => sheet.AgeDeductions[characteristic]);
        return new AgeEffectsResponse(bracket, deductions, checks);
    }

    private static OccupationViewResponse ToOccupationView(OccupationSelection selection, ResolvedOccupation? resolved) =>
        new(
            selection.CatalogId,
            selection.Custom is { } custom
                ? new CustomOccupationResponse(
                    custom.Name,
                    custom.FormulaId,
                    custom.Skills.Select(skill => skill is null ? null : ToSkillResponse(skill)).ToList(),
                    custom.CreditRatingMin,
                    custom.CreditRatingMax)
                : null,
            selection.FormulaCharacteristics,
            selection.SkillChoices.Select(picks => (IReadOnlyList<SkillReferenceResponse>)picks.Select(ToSkillResponse).ToList()).ToList(),
            resolved?.Name,
            resolved?.CreditRatingMin,
            resolved?.CreditRatingMax,
            resolved?.IsCustom ?? false,
            resolved?.Formula is { } formula ? OccupationPointFormulas.IdOf(formula) : null,
            resolved?.CreditRatingMin is { } minimum ? ToQuickFireCreditRating(QuickFireRules.CreditRatingFor(minimum)) : null);

    private static QuickFireCreditRatingResponse ToQuickFireCreditRating(QuickFireCreditRating creditRating) =>
        new(creditRating.Value, creditRating.FreedValue);

    private static SkillRowResponse ToSkillRow(SkillRow row) =>
        new(row.Skill.Skill, row.Skill.Specialization, row.Base, row.OccupationPoints, row.PersonalInterestPoints, row.Value, row.Hard, row.Extreme, row.IsOccupationSkill);

    private static SkillReferenceResponse ToSkillResponse(SkillReference skill) => new(skill.Skill, skill.Specialization);

    private static DerivedResponse ToDerived(DerivedValues derived) =>
        new(
            derived.Luck,
            derived.HitPoints,
            derived.MagicPoints,
            new SanityResponse(derived.SanityCurrent, derived.SanityMaximum),
            derived.Dodge,
            derived.MovementRate,
            derived.DamageBonus,
            derived.Build,
            ToBudget(derived.OccupationPoints),
            ToBudget(derived.PersonalInterestPoints),
            derived.CreditRating,
            derived.Wealth is { } wealth
                ? new WealthResponse(wealth.Currency, ToMoney(wealth.SpendingLevel), ToMoney(wealth.Cash), wealth.Assets is null ? null : ToMoney(wealth.Assets))
                : null);

    private static PointBudgetResponse? ToBudget(PointBudget? budget) =>
        budget is null ? null : new PointBudgetResponse(budget.Budget, budget.Spent, budget.Left);

    private static MoneyResponse ToMoney(MoneyAmount amount) => new(amount.Amount, amount.OrMore);

    private static OccupationSelection ToOccupation(OccupationRequest occupation) =>
        new(
            occupation.CatalogId,
            occupation.Custom is { } custom
                ? new CustomOccupation(
                    custom.Name,
                    custom.FormulaId,
                    (custom.Skills ?? []).Select(skill => skill is null ? null : ToSkill(skill.Skill, skill.Specialization)).ToList(),
                    custom.CreditRatingMin,
                    custom.CreditRatingMax)
                : null,
            occupation.FormulaCharacteristics ?? [],
            (occupation.SkillChoices ?? [])
                .Select(picks => (IReadOnlyList<SkillReference>)picks.Select(pick => ToSkill(pick.Skill, pick.Specialization)).ToList())
                .ToList());

    private static QuickFireSkills ToQuickFire(QuickFireRequest? quickFire) =>
        quickFire is null
            ? QuickFireSkills.Empty
            : new QuickFireSkills(
                (quickFire.Values ?? []).Select(value => new QuickFireSkillValue(ToSkill(value.Skill, value.Specialization), value.Value)).ToList(),
                (quickFire.PersonalInterests ?? []).Select(skill => ToSkill(skill.Skill, skill.Specialization)).ToList(),
                quickFire.ExtraSkill is null ? null : ToSkill(quickFire.ExtraSkill.Skill, quickFire.ExtraSkill.Specialization));

    private static CharacteristicRollFormulaResponse ToFormula(CharacteristicRollFormula formula) =>
        new(formula.Dice.ToString(), formula.Bonus, formula.Multiplier);

    private static IReadOnlyList<OccupationPointTermResponse> ToTerms(OccupationPointFormula formula) =>
        formula.Terms.Select(term => new OccupationPointTermResponse(term.Characteristics, term.Multiplier)).ToList();

    private static CharacteristicValues ToValues(Dictionary<string, int?>? values) =>
        CharacteristicValues.From((values ?? []).Select(entry =>
        {
            CharacteristicCodes.TryParse(entry.Key, out var characteristic);
            return KeyValuePair.Create(characteristic, entry.Value);
        }));
}
