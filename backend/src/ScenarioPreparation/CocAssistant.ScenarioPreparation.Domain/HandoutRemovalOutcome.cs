namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of removing a Handout; only a Prepared Scene's Handouts can be removed.</summary>
public enum HandoutRemovalOutcome
{
    Removed,
    SceneNotPrepared,
    HandoutNotFound,
}
