namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of applying a requested order to a Scenario's Scenes.</summary>
public enum SceneOrderOutcome
{
    Reordered,
    DuplicateIds,
    DoesNotMatchScenes,
}
