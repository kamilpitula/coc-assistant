namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Validates a Character Sheet against docs/game-rules/coc7_character_creation_and_development_rules.md section 15,
/// reporting every problem as a <see cref="ValidationError"/> and never correcting input (specs/character-sheet/spec.md,
/// Validation). The server's result is authoritative.
/// </summary>
public static class CharacterSheetValidator
{
    public static IReadOnlyList<ValidationError> Validate(
        CharacterSheet sheet,
        AllowedCreationMethods allowedCreationMethods,
        CharacterSheetComputation computation,
        CreationRuleSet rules) =>
        IdentityProblems(sheet.Identity)
            .Concat(CreationMethodProblems(sheet.CreationMethod, allowedCreationMethods))
            .Concat(CharacteristicPresenceProblems(sheet.AssignedCharacteristics))
            .Concat(sheet.CreationMethod == CreationMethod.PointBuy ? PointBuyProblems(sheet.AssignedCharacteristics) : [])
            .Concat(AgeEffectsValidation.LuckProblems(sheet, computation.Bracket))
            .Concat(AgeDependentProblems(sheet, computation))
            .ToList();

    // Skipped while the age is missing or out of range: the age error already blocks submission.
    private static IEnumerable<ValidationError> AgeDependentProblems(CharacterSheet sheet, CharacterSheetComputation computation) =>
        computation.Bracket is not { } bracket
            ? []
            : AgeEffectsValidation.DeductionProblems(sheet, bracket)
                .Concat(AgeEffectsValidation.EduImprovementProblems(sheet, bracket, computation.EduImprovementOutcomes))
                .Concat(AgeEffectsValidation.FloorProblems(sheet, computation));

    // Identity fields: section 1.1; age range: project_ruleset.md section 4.1.
    private static IEnumerable<ValidationError> IdentityProblems(InvestigatorIdentity identity)
    {
        if (string.IsNullOrWhiteSpace(identity.Name))
        {
            yield return ValidationErrors.InvestigatorNameRequired();
        }

        if (identity.Age is null)
        {
            yield return ValidationErrors.AgeRequired();
        }
        else if (!InvestigatorAgeRange.Contains(identity.Age.Value))
        {
            yield return ValidationErrors.AgeOutOfRange(identity.Age.Value);
        }
    }

    private static IEnumerable<ValidationError> CreationMethodProblems(CreationMethod? method, AllowedCreationMethods allowed)
    {
        if (method is null)
        {
            yield return ValidationErrors.CreationMethodRequired();
        }
        else if (!allowed.Allows(method.Value))
        {
            yield return ValidationErrors.CreationMethodNotAllowed(method.Value, allowed);
        }
    }

    // Section 15: exactly eight core characteristics exist.
    private static IEnumerable<ValidationError> CharacteristicPresenceProblems(CharacteristicValues assigned) =>
        CharacteristicCodes.All
            .Where(characteristic => assigned[characteristic] is null)
            .Select(ValidationErrors.CharacteristicRequired);

    // Section 2.2: bounds per value, the exact total, and the INT and SIZ recommendation.
    private static IEnumerable<ValidationError> PointBuyProblems(CharacteristicValues assigned)
    {
        var outOfRange = assigned.Present
            .Where(characteristic => assigned[characteristic] is < PointBuyRules.Minimum or > PointBuyRules.Maximum)
            .Select(characteristic => ValidationErrors.PointBuyValueOutOfRange(characteristic, assigned[characteristic]!.Value));

        var total = assigned.Present.Sum(characteristic => assigned[characteristic]!.Value);
        var totalMismatch = assigned.IsComplete && total != PointBuyRules.Budget
            ? [ValidationErrors.PointBuyTotalMismatch(total)]
            : Array.Empty<ValidationError>();

        var belowRecommendation = PointBuyRules.RecommendationApplies
            .Where(characteristic => assigned[characteristic] < PointBuyRules.RecommendedMinimum)
            .Select(characteristic => ValidationErrors.PointBuyBelowRecommendation(characteristic, assigned[characteristic]!.Value));

        return outOfRange.Concat(totalMismatch).Concat(belowRecommendation);
    }
}
