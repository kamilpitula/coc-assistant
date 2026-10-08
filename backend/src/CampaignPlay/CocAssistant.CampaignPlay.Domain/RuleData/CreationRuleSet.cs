namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>
/// The rule data a Character Sheet of one Era is computed and validated against: the creation rules that apply to
/// every Era and the Era's own catalogs (docs/game-rules/project_ruleset.md section 1).
/// </summary>
public sealed record CreationRuleSet(
    AgeRules AgeRules,
    CharacteristicsRules CharacteristicsRules,
    SkillSpecializationCatalog Specializations,
    OccupationCatalog Occupations,
    SkillCatalog Skills,
    WealthTable Wealth);
