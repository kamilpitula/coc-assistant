namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Whether a skill the Player names can be on the sheet: a catalog skill (section 6.1), or a specialized skill with a
/// specialization the rules allow (section 6.2; docs/game-rules/project_ruleset.md section 4.2).
/// </summary>
internal static class SkillReferenceValidation
{
    /// <summary>The specialization problem of a skill, or <paramref name="whenUnknown"/> when the skill is unknown.</summary>
    public static IEnumerable<ValidationError> Problems(SkillReference skill, string field, CreationRuleSet rules, Func<ValidationError> whenUnknown) =>
        SkillBases.Resolve(skill, rules).Kind switch
        {
            SkillResolutionKind.SpecializationRequired => [ValidationErrors.SpecializationRequired(field, skill)],
            SkillResolutionKind.SpecializationNotAllowed => [ValidationErrors.SpecializationNotAllowed(field, skill)],
            SkillResolutionKind.Unknown => [whenUnknown()],
            _ => [],
        };

    /// <summary>Credit Rating and Cthulhu Mythos are never occupation skills or personal interest skills (sections 7.2 and 8).</summary>
    public static bool IsCreditRatingOrCthulhuMythos(SkillReference skill) =>
        skill.Equals(SkillReference.CreditRating) || skill.Equals(SkillReference.CthulhuMythos);
}
