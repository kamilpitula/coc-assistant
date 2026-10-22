namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of applying a requested order to a Scene's Handouts.</summary>
public enum HandoutOrderOutcome
{
    Reordered,
    SceneFinished,
    DuplicateIds,
    DoesNotMatchHandouts,
}
