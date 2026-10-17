namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Scenario Preparation's port for the Era-independent rule data NPC Profiles need, implemented in its Infrastructure
/// over Campaign Play's catalogs (ADR 0008, ADR 0017). It needs no Era: custom skill names are allowed
/// (docs/game-rules/project_ruleset.md section 5.7).
/// </summary>
public interface INonPlayerEntityRuleData
{
    /// <summary>The Damage Bonus and Build table.</summary>
    CharacteristicsRules CharacteristicsRules { get; }

    /// <summary>The closed Fighting and Firearms specializations.</summary>
    CombatSkillSpecializations CombatSkillSpecializations { get; }
}
