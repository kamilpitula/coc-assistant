namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>The stored Quick Fire extra skill and the freed value it takes (section 18 assumption).</summary>
public sealed record QuickFireExtra(SkillReference Skill, int Value);

/// <summary>One skill on the sheet with its base, the points or Quick Fire values on it, and its levels (section 9).</summary>
public sealed record SkillRow(
    SkillReference Skill,
    int? Base,
    int? OccupationPoints,
    int? PersonalInterestPoints,
    int? Value,
    int? Hard,
    int? Extreme,
    bool IsOccupationSkill);

/// <summary>
/// Skill post-processing: docs/game-rules/coc7_character_creation_and_development_rules.md section 9. Values are base
/// plus allocated points (sections 7.2 and 8); with Quick Fire an assigned value replaces the base and a personal
/// interest adds its bonus (section 18). Own Language and Dodge take their bases from EDU and DEX (section 6.1).
/// </summary>
public static class SkillPostProcessing
{
    public static IReadOnlyList<SkillRow> Compute(
        CharacterSheet sheet,
        CharacteristicValues final,
        IReadOnlyList<SkillReference> occupationSkills,
        CreationRuleSet rules,
        QuickFireExtra? extra = null)
    {
        var catalogSkills = rules.Skills.Skills.Select(definition => definition.Reference);
        var addedSkills = sheet.SkillAllocations.Select(allocation => allocation.Skill)
            .Concat(occupationSkills)
            .Concat(sheet.QuickFire.Values.Select(value => value.Skill))
            .Concat(sheet.QuickFire.PersonalInterests);

        return catalogSkills.Concat(addedSkills)
            .Distinct()
            .Select(skill => RowFor(skill, sheet, final, occupationSkills, rules, extra))
            .ToList();
    }

    private static SkillRow RowFor(
        SkillReference skill,
        CharacterSheet sheet,
        CharacteristicValues final,
        IReadOnlyList<SkillReference> occupationSkills,
        CreationRuleSet rules,
        QuickFireExtra? extra)
    {
        var baseValue = SkillBases.Resolve(skill, rules).Base?.For(final);
        var allocation = sheet.SkillAllocations.FirstOrDefault(candidate => candidate.Skill.Equals(skill));
        var value = sheet.CreationMethod == CreationMethod.QuickFire
            ? (extra is not null && extra.Skill.Equals(skill) ? extra.Value : QuickFireValue(skill, baseValue, sheet.QuickFire))
            : baseValue + (allocation?.OccupationPoints ?? 0) + (allocation?.PersonalInterestPoints ?? 0);
        var levels = value is { } regular ? CharacteristicLevels.For(regular) : null;

        return new SkillRow(
            skill,
            baseValue,
            allocation?.OccupationPoints,
            allocation?.PersonalInterestPoints,
            value,
            levels?.Hard,
            levels?.Extreme,
            occupationSkills.Contains(skill));
    }

    // Section 18: an assigned value is final; a personal interest adds its bonus to the base.
    private static int? QuickFireValue(SkillReference skill, int? baseValue, QuickFireSkills quickFire)
    {
        var assigned = quickFire.Values.FirstOrDefault(value => value.Skill.Equals(skill))?.Value;
        if (assigned is not null)
        {
            return assigned;
        }

        return quickFire.PersonalInterests.Contains(skill) ? baseValue + QuickFireRules.PersonalInterestBonus : baseValue;
    }
}
