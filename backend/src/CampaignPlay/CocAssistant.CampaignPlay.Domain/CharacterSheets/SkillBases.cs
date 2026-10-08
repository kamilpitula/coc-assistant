namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Whether a skill can be placed on the sheet, and its base when it can.</summary>
public enum SkillResolutionKind
{
    Known,
    SpecializationRequired,
    SpecializationNotAllowed,
    Unknown,
}

public sealed record SkillResolution(SkillResolutionKind Kind, SkillBase? Base)
{
    public static readonly SkillResolution Unknown = new(SkillResolutionKind.Unknown, null);
    public static readonly SkillResolution SpecializationRequired = new(SkillResolutionKind.SpecializationRequired, null);
    public static readonly SkillResolution SpecializationNotAllowed = new(SkillResolutionKind.SpecializationNotAllowed, null);

    public bool IsKnown => Kind == SkillResolutionKind.Known;
}

/// <summary>
/// Skill base values: the Era's skill catalog (docs/game-rules/coc7_character_creation_and_development_rules.md section
/// 6.1) and the specialized skills (section 6.2; docs/game-rules/project_ruleset.md section 4.2).
/// </summary>
public static class SkillBases
{
    public static SkillResolution Resolve(SkillReference skill, CreationRuleSet rules)
    {
        if (rules.Specializations.IsClosedFamily(skill.Skill))
        {
            return ResolveClosed(skill, rules.Specializations);
        }

        if (rules.Specializations.IsOpenFamily(skill.Skill))
        {
            return skill.Specialization is null ? SkillResolution.SpecializationRequired : Known(rules.Skills.Find(new SkillReference(skill.Skill)));
        }

        return Known(rules.Skills.Find(skill));
    }

    /// <summary>True when the skill is specialized (section 6.1), so a slot naming it with "any" needs a specialization.</summary>
    public static bool IsSpecializedFamily(string skill, CreationRuleSet rules) =>
        rules.Specializations.IsClosedFamily(skill) || rules.Specializations.IsOpenFamily(skill);

    private static SkillResolution ResolveClosed(SkillReference skill, SkillSpecializationCatalog specializations)
    {
        if (skill.Specialization is null)
        {
            return SkillResolution.SpecializationRequired;
        }

        return specializations.ClosedBaseFor(skill) is { } value
            ? new SkillResolution(SkillResolutionKind.Known, SkillBase.Fixed(value))
            : SkillResolution.SpecializationNotAllowed;
    }

    private static SkillResolution Known(SkillDefinition? definition) =>
        definition is null ? SkillResolution.Unknown : new SkillResolution(SkillResolutionKind.Known, definition.Base);
}
