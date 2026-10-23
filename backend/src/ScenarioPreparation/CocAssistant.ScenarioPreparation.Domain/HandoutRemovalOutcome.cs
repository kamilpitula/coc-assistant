namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of removing a Handout; only a Prepared Scene's Handouts, and an Item's Handouts while it is not in play, can be removed.</summary>
public enum HandoutRemovalOutcome
{
    Removed,
    SceneNotPrepared,
    ItemInPlay,
    HandoutNotFound,
}
