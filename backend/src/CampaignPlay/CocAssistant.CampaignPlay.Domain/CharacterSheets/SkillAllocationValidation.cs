namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Validation of occupation and personal interest points under Standard Rolling and Point Buy
/// (docs/game-rules/coc7_character_creation_and_development_rules.md sections 7.1, 7.2, 7.3, 8, and 15;
/// docs/game-rules/project_ruleset.md sections 3 and 4.6).
/// </summary>
internal static class SkillAllocationValidation
{
    public static IEnumerable<ValidationError> Problems(CharacterSheet sheet, CharacterSheetComputation computation, CreationRuleSet rules) =>
        sheet.SkillAllocations
            .SelectMany((allocation, index) => AllocationProblems(allocation, index, computation.Occupation, rules))
            .Concat(BudgetProblems(computation.Derived))
            .Concat(CreditRatingProblems(computation));

    private static IEnumerable<ValidationError> AllocationProblems(SkillAllocation allocation, int index, ResolvedOccupation? occupation, CreationRuleSet rules) =>
        PointProblems(allocation, ValidationErrors.OccupationPointsField(index), allocation.OccupationPoints)
            .Concat(PointProblems(allocation, ValidationErrors.PersonalInterestPointsField(index), allocation.PersonalInterestPoints))
            .Concat(CreditRatingPersonalInterestProblems(allocation, index))
            .Concat(OutsideOccupationProblems(allocation, index, occupation))
            .Concat(SkillReferenceValidation.Problems(
                allocation.Skill,
                $"{ValidationErrors.SkillField(index)}.skill",
                rules,
                () => ValidationErrors.UnknownSkill(index, allocation.Skill)));

    // Sections 7.2 and 8: points are 0 or more; Cthulhu Mythos takes none at creation.
    private static IEnumerable<ValidationError> PointProblems(SkillAllocation allocation, string field, int? points) =>
        points switch
        {
            < 0 => [ValidationErrors.SkillPointsNegative(field, allocation.Skill, points.Value)],
            > 0 when allocation.Skill.Equals(SkillReference.CthulhuMythos) => [ValidationErrors.CreationPointsOnCthulhuMythos(field, points.Value)],
            _ => [],
        };

    // Project ruleset 4.6: Credit Rating takes occupation points only.
    private static IEnumerable<ValidationError> CreditRatingPersonalInterestProblems(SkillAllocation allocation, int index) =>
        allocation.Skill.Equals(SkillReference.CreditRating) && allocation.PersonalInterestPoints is > 0
            ? [ValidationErrors.PersonalInterestPointsOnCreditRating(index, allocation.PersonalInterestPoints.Value)]
            : [];

    // Section 7.2: occupation points go to the occupation's skills and Credit Rating.
    private static IEnumerable<ValidationError> OutsideOccupationProblems(SkillAllocation allocation, int index, ResolvedOccupation? occupation) =>
        allocation.OccupationPoints is > 0
        && occupation is { IsKnown: true }
        && !SkillReferenceValidation.IsCreditRatingOrCthulhuMythos(allocation.Skill)
        && !occupation.IsOccupationSkill(allocation.Skill)
            ? [ValidationErrors.OccupationPointsOutsideOccupationSkills(index, allocation.Skill, allocation.OccupationPoints.Value)]
            : [];

    private static IEnumerable<ValidationError> BudgetProblems(DerivedValues derived) =>
        BudgetProblems(derived.OccupationPoints, ValidationErrors.OccupationPointsOverspent, ValidationErrors.OccupationPointsUnspent)
            .Concat(BudgetProblems(derived.PersonalInterestPoints, ValidationErrors.PersonalInterestPointsOverspent, ValidationErrors.PersonalInterestPointsUnspent));

    // Overspending is an error; unspent points are lost, so they only warn (sections 7.2 and 8).
    private static IEnumerable<ValidationError> BudgetProblems(
        PointBudget? budget,
        Func<PointBudget, ValidationError> overspent,
        Func<PointBudget, ValidationError> unspent) =>
        budget switch
        {
            { Left: < 0 } => [overspent(budget)],
            { Left: > 0 } => [unspent(budget)],
            _ => [],
        };

    // Sections 7.2 and 7.3: Credit Rating stays inside the occupation's range.
    private static IEnumerable<ValidationError> CreditRatingProblems(CharacterSheetComputation computation) =>
        computation.Occupation is { CreditRatingMin: { } minimum, CreditRatingMax: { } maximum }
        && OccupationValidation.IsValidCreditRatingRange(minimum, maximum)
        && computation.Derived.CreditRating is { } creditRating
        && (creditRating < minimum || creditRating > maximum)
            ? [ValidationErrors.CreditRatingOutOfRange(minimum, maximum, creditRating)]
            : [];
}
