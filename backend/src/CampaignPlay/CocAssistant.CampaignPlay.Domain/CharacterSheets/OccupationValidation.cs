namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Validation of the Occupation (docs/game-rules/coc7_character_creation_and_development_rules.md sections 7, 7.1,
/// 7.2, and 15; docs/game-rules/project_ruleset.md section 4.5): it exists in the Era's catalog or is a complete
/// custom definition, its formula choice is made, and every open skill slot has allowed picks.
/// </summary>
internal static class OccupationValidation
{
    public static IEnumerable<ValidationError> Problems(CharacterSheet sheet, ResolvedOccupation? occupation, CreationRuleSet rules)
    {
        if (occupation is null || sheet.Occupation is not { } selection)
        {
            return [ValidationErrors.OccupationRequired()];
        }

        if (selection.Custom is { } custom && selection.CatalogId is null)
        {
            return CustomProblems(custom, rules).Concat(FormulaChoiceProblems(sheet, occupation));
        }

        return occupation.IsKnown
            ? FormulaChoiceProblems(sheet, occupation).Concat(SlotProblems(selection, occupation, rules))
            : [ValidationErrors.OccupationNotAvailable(selection.CatalogId!)];
    }

    // Section 7.1: a term offering several characteristics needs the Player's pick. Quick Fire has no occupation points.
    private static IEnumerable<ValidationError> FormulaChoiceProblems(CharacterSheet sheet, ResolvedOccupation occupation) =>
        sheet.CreationMethod == CreationMethod.QuickFire || occupation.Formula is not { } formula
            ? []
            : formula.Terms
                .Select((term, index) => (term, index))
                .Where(pair => pair.term.Characteristics.Count > 1
                    && OccupationPoints.CharacteristicFor(pair.term, sheet.Occupation!.FormulaCharacteristics.ElementAtOrDefault(pair.index)) is null)
                .Select(pair => ValidationErrors.OccupationFormulaChoiceRequired(pair.index, pair.term.Characteristics));

    private static IEnumerable<ValidationError> CustomProblems(CustomOccupation custom, CreationRuleSet rules)
    {
        var problems = new List<ValidationError>();
        if (string.IsNullOrWhiteSpace(custom.Name))
        {
            problems.Add(ValidationErrors.CustomOccupationNameRequired());
        }

        if (OccupationPointFormulas.Find(custom.FormulaId) is null)
        {
            problems.Add(ValidationErrors.CustomOccupationFormulaNotAllowed(custom.FormulaId));
        }

        if (!IsValidCreditRatingRange(custom.CreditRatingMin, custom.CreditRatingMax))
        {
            problems.Add(ValidationErrors.CustomOccupationCreditRatingRangeInvalid(custom.CreditRatingMin, custom.CreditRatingMax));
        }

        return problems.Concat(CustomSkillProblems(custom, rules));
    }

    /// <summary>A Credit Rating range inside section 7.3's values with the minimum no higher than the maximum.</summary>
    public static bool IsValidCreditRatingRange(int? minimum, int? maximum) =>
        minimum is { } low && maximum is { } high && CreditRatingRange.Contains(low) && CreditRatingRange.Contains(high) && low <= high;

    private static IEnumerable<ValidationError> CustomSkillProblems(CustomOccupation custom, CreationRuleSet rules)
    {
        var taken = new List<SkillReference>();
        var problems = new List<ValidationError>();
        for (var index = 0; index < CustomOccupationRules.SkillCount; index++)
        {
            var field = ValidationErrors.CustomOccupationSkillField(index);
            problems.AddRange(custom.Skills.ElementAtOrDefault(index) is { } skill
                ? PickProblems(skill, field, true, taken, rules)
                : [ValidationErrors.CustomOccupationSkillRequired(index)]);
        }

        return problems;
    }

    private static IEnumerable<ValidationError> SlotProblems(OccupationSelection selection, ResolvedOccupation occupation, CreationRuleSet rules)
    {
        var taken = occupation.Slots.Select(OccupationResolution.FixedSkillOf).OfType<SkillReference>().ToList();
        var problems = new List<ValidationError>();
        foreach (var (slot, index) in occupation.Slots.Select((slot, index) => (slot, index)))
        {
            if (OccupationResolution.FixedSkillOf(slot) is null)
            {
                problems.AddRange(OpenSlotProblems(slot, index, selection.SkillChoices.ElementAtOrDefault(index) ?? [], taken, rules));
            }
        }

        return problems;
    }

    private static IEnumerable<ValidationError> OpenSlotProblems(
        OccupationSkillSlot slot,
        int slotIndex,
        IReadOnlyList<SkillReference> picks,
        List<SkillReference> taken,
        CreationRuleSet rules)
    {
        var needed = OccupationResolution.PicksNeeded(slot);
        var problems = new List<ValidationError>();
        if (picks.Count < needed)
        {
            problems.Add(ValidationErrors.OccupationSkillChoiceRequired(slotIndex, needed, picks.Count));
        }

        foreach (var (pick, pickIndex) in picks.Select((pick, pickIndex) => (pick, pickIndex)))
        {
            var allowed = pickIndex < needed && SlotAllows(slot, pick, rules.Occupations);
            problems.AddRange(PickProblems(pick, ValidationErrors.SkillChoicePickField(slotIndex, pickIndex), allowed, taken, rules));
        }

        return problems;
    }

    // Project ruleset 4.5: no repeated occupation skill and no Cthulhu Mythos; Credit Rating is never a slot pick.
    private static IEnumerable<ValidationError> PickProblems(SkillReference pick, string field, bool allowedBySlot, List<SkillReference> taken, CreationRuleSet rules)
    {
        var notAllowed = !allowedBySlot || SkillReferenceValidation.IsCreditRatingOrCthulhuMythos(pick) || taken.Contains(pick);
        taken.Add(pick);
        return notAllowed
            ? [ValidationErrors.OccupationSkillChoiceNotAllowed(field, pick)]
            : SkillReferenceValidation.Problems(pick, field, rules, () => ValidationErrors.OccupationSkillChoiceNotAllowed(field, pick));
    }

    private static bool SlotAllows(OccupationSkillSlot slot, SkillReference pick, OccupationCatalog catalog) =>
        slot.Kind switch
        {
            OccupationSkillSlotKind.Skill => pick.IsSkill(slot.Skill!),
            OccupationSkillSlotKind.Group => catalog.SkillGroups.GetValueOrDefault(slot.Group!, []).Any(entry => EntryAllows(entry, pick)),
            OccupationSkillSlotKind.Choice => (slot.From ?? []).Any(entry => EntryAllows(entry, pick)),
            _ => true,
        };

    private static bool EntryAllows(OccupationSkillSlot entry, SkillReference pick) =>
        pick.IsSkill(entry.Skill!)
        && (entry.Specialization == OccupationResolution.AnySpecialization
            || string.Equals(entry.Specialization, pick.Specialization, StringComparison.OrdinalIgnoreCase));
}
