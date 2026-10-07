namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Application port for the verified rule data of one Era, loaded from docs/game-rules/catalogs
/// (see docs/game-rules/project_ruleset.md section 1). Implemented by Infrastructure.
/// </summary>
public interface IEraRuleData
{
    Era Era { get; }

    OccupationCatalog Occupations { get; }

    /// <summary>docs/game-rules/catalogs/skills.&lt;era&gt;.json (section 6.1 data).</summary>
    SkillCatalog Skills { get; }

    /// <summary>docs/game-rules/catalogs/wealth.&lt;era&gt;.json (section 11 data).</summary>
    WealthTable Wealth { get; }
}
