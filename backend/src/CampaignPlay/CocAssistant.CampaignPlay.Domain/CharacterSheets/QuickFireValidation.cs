namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Validation of Quick Fire (docs/game-rules/coc7_character_creation_and_development_rules.md sections 2.3 and 18,
/// including the project assumptions recorded in section 18): the characteristic pool, the skill values on the
/// occupation skills and Credit Rating, and the personal interest skills.
/// </summary>
internal static class QuickFireValidation
{
    // Section 2.3: each pool value exactly once.
    public static IEnumerable<ValidationError> CharacteristicProblems(CharacteristicValues assigned)
    {
        var notInPool = assigned.Present
            .Where(characteristic => !QuickFireRules.CharacteristicValues.Contains(assigned[characteristic]!.Value))
            .Select(characteristic => ValidationErrors.QuickFireValueNotInPool(characteristic, assigned[characteristic]!.Value))
            .ToList();

        var values = assigned.Present.Select(characteristic => assigned[characteristic]!.Value).ToList();
        var mismatch = assigned.IsComplete && notInPool.Count == 0 && !values.Order().SequenceEqual(QuickFireRules.CharacteristicValues.Order());
        return mismatch ? [ValidationErrors.QuickFireAssignmentMismatch(values)] : notInPool;
    }

    public static IEnumerable<ValidationError> SkillProblems(CharacterSheet sheet, CharacterSheetComputation computation, CreationRuleSet rules)
    {
        var quickFire = sheet.QuickFire;
        var valueProblems = quickFire.Values.SelectMany((value, index) => ValueProblems(value, index, rules));
        var occupationProblems = computation.Occupation is { CreditRatingMin: { } minimum } occupation
            ? OccupationValueProblems(quickFire, occupation, QuickFireRules.CreditRatingFor(minimum), computation.QuickFireExtraSkill)
            : [];

        return valueProblems
            .Concat(occupationProblems)
            .Concat(PersonalInterestCountProblems(quickFire.PersonalInterests.Count))
            .Concat(PersonalInterestProblems(quickFire, computation, rules));
    }

    private static IEnumerable<ValidationError> ValueProblems(QuickFireSkillValue value, int index, CreationRuleSet rules)
    {
        // Credit Rating's value has its own rule (section 18 assumption), so only the other values come from the pool.
        var notInPool = value.Value is { } assigned && !value.Skill.Equals(SkillReference.CreditRating) && !QuickFireRules.SkillValues.Contains(assigned)
            ? [ValidationErrors.QuickFireSkillValueNotInPool(index, assigned)]
            : Array.Empty<ValidationError>();
        var field = $"{ValidationErrors.QuickFireValueField(index)}.skill";
        return notInPool.Concat(SkillReferenceValidation.Problems(
            value.Skill, field, rules, () => ValidationErrors.QuickFireSkillNotOccupationSkill(index, value.Skill)));
    }

    private static IEnumerable<ValidationError> OccupationValueProblems(
        QuickFireSkills quickFire,
        ResolvedOccupation occupation,
        QuickFireCreditRating creditRating,
        SkillReference? extraSkill)
    {
        var outside = quickFire.Values
            .Select((value, index) => (value, index))
            .Where(pair => !IsAssignable(pair.value.Skill, pair.index, quickFire, occupation, extraSkill))
            .Select(pair => ValidationErrors.QuickFireSkillNotOccupationSkill(pair.index, pair.value.Skill));

        var creditRatingValue = ValueOf(quickFire, SkillReference.CreditRating);
        var creditRatingProblem = creditRatingValue != creditRating.Value
            ? [ValidationErrors.QuickFireCreditRatingValue(creditRating.Value, creditRatingValue)]
            : Array.Empty<ValidationError>();

        return outside.Concat(creditRatingProblem).Concat(AssignmentProblems(quickFire, occupation, creditRating, extraSkill));
    }

    // A value may go to Credit Rating, an occupation skill, or (first occurrence only) the extra skill for a freed value.
    private static bool IsAssignable(SkillReference skill, int index, QuickFireSkills quickFire, ResolvedOccupation occupation, SkillReference? extraSkill) =>
        skill.Equals(SkillReference.CreditRating)
        || (occupation.IsOccupationSkill(skill) && !skill.Equals(SkillReference.CthulhuMythos))
        || (skill.Equals(extraSkill) && FirstIndexOf(quickFire, skill) == index && !skill.Equals(SkillReference.CthulhuMythos));

    // Section 18: the occupation skills take the pool less Credit Rating's value; a freed value goes to the extra skill.
    private static IEnumerable<ValidationError> AssignmentProblems(
        QuickFireSkills quickFire,
        ResolvedOccupation occupation,
        QuickFireCreditRating creditRating,
        SkillReference? extraSkill)
    {
        var occupationValues = occupation.OccupationSkills.Select(skill => ValueOf(quickFire, skill)).OfType<int>().ToList();
        var extraValue = extraSkill is null ? null : ValueOf(quickFire, extraSkill);
        var assigned = occupationValues.Concat(extraValue is { } value ? [value] : Array.Empty<int>()).ToList();
        var expected = creditRating.FreedValue is null ? QuickFireRules.OccupationSkillValues(creditRating) : QuickFireRules.SkillValues;

        var matches = assigned.Order().SequenceEqual(expected.Order())
            && (creditRating.FreedValue is null || extraValue == creditRating.FreedValue)
            && occupationValues.Count == occupation.OccupationSkills.Count;
        return matches ? [] : [ValidationErrors.QuickFireSkillAssignmentMismatch(expected, assigned)];
    }

    private static IEnumerable<ValidationError> PersonalInterestCountProblems(int chosen) =>
        chosen switch
        {
            > QuickFireRules.PersonalInterestCount => [ValidationErrors.QuickFirePersonalInterestsTooMany(chosen)],
            < QuickFireRules.PersonalInterestCount => [ValidationErrors.QuickFirePersonalInterestsUnchosen(chosen)],
            _ => [],
        };

    // Section 18: four non-occupation skills, never Credit Rating or Cthulhu Mythos, each chosen once (assumption).
    private static IEnumerable<ValidationError> PersonalInterestProblems(QuickFireSkills quickFire, CharacterSheetComputation computation, CreationRuleSet rules) =>
        quickFire.PersonalInterests.SelectMany((skill, index) =>
        {
            var field = ValidationErrors.QuickFirePersonalInterestField(index);
            var notAllowed = SkillReferenceValidation.IsCreditRatingOrCthulhuMythos(skill)
                || computation.Occupation?.IsOccupationSkill(skill) == true
                || skill.Equals(computation.QuickFireExtraSkill)
                || quickFire.PersonalInterests.Take(index).Contains(skill);
            return notAllowed
                ? [ValidationErrors.QuickFirePersonalInterestNotAllowed(index, skill)]
                : SkillReferenceValidation.Problems(skill, field, rules, () => ValidationErrors.QuickFirePersonalInterestNotAllowed(index, skill));
        });

    private static int? ValueOf(QuickFireSkills quickFire, SkillReference skill) =>
        quickFire.Values.FirstOrDefault(value => value.Skill.Equals(skill))?.Value;

    private static int FirstIndexOf(QuickFireSkills quickFire, SkillReference skill) =>
        quickFire.Values.Select((value, index) => (value, index)).First(pair => pair.value.Skill.Equals(skill)).index;
}
