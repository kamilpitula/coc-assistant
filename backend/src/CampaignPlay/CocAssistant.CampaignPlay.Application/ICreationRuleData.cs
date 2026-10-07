namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Application port for the creation rule data that applies to every Era, loaded from docs/game-rules/catalogs
/// (ADR 0006 amendment). Implemented by Infrastructure.
/// </summary>
public interface ICreationRuleData
{
    /// <summary>docs/game-rules/catalogs/age-rules.json (section 3.1 data).</summary>
    AgeRules AgeRules { get; }

    /// <summary>docs/game-rules/catalogs/characteristics-rules.json (section 5.8 data).</summary>
    CharacteristicsRules CharacteristicsRules { get; }

    /// <summary>docs/game-rules/catalogs/skill-specializations.json (section 6.2 data).</summary>
    SkillSpecializationCatalog SkillSpecializations { get; }
}
