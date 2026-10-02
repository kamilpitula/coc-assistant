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
        CreationDice.EduImprovementGain.ToString());

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
            request.LuckRolls ?? []);

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
            CharacteristicCodes.All.ToDictionary(characteristic => characteristic.ToCode(), characteristic => ToCharacteristic(characteristic, sheet, computation)),
            ToAgeEffects(sheet, computation),
            sheet.LuckRolls,
            ToDerived(computation.Derived),
            sheet.RollRecords.Select(record => new RollRecordResponse(record.Purpose, record.Dice, record.Result, record.Source.ToString())).ToList());
    }

    private static CharacteristicResponse ToCharacteristic(Characteristic characteristic, CharacterSheet sheet, CharacterSheetComputation computation)
    {
        var levels = computation.LevelsOf(characteristic);
        return new CharacteristicResponse(sheet.AssignedCharacteristics[characteristic], levels?.Regular, levels?.Hard, levels?.Extreme);
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

    private static DerivedResponse ToDerived(DerivedValues derived) =>
        new(
            derived.Luck,
            derived.HitPoints,
            derived.MagicPoints,
            new SanityResponse(derived.SanityCurrent, derived.SanityMaximum),
            derived.Dodge,
            derived.MovementRate,
            derived.DamageBonus,
            derived.Build);

    private static CharacteristicValues ToValues(Dictionary<string, int?>? values) =>
        CharacteristicValues.From((values ?? []).Select(entry =>
        {
            CharacteristicCodes.TryParse(entry.Key, out var characteristic);
            return KeyValuePair.Create(characteristic, entry.Value);
        }));
}
