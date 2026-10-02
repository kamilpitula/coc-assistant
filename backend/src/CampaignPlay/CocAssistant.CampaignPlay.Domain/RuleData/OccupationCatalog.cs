namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>
/// The catalog Occupations for one Era, mirroring docs/game-rules/catalogs/occupations.&lt;era&gt;.json
/// (occupation rules: docs/game-rules/coc7_character_creation_and_development_rules.md section 7).
/// </summary>
public sealed record OccupationCatalog(
    Era Era,
    IReadOnlyDictionary<string, IReadOnlyList<OccupationSkillSlot>> SkillGroups,
    IReadOnlyList<Occupation> Occupations);
