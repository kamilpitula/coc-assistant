namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Scene that links an Item, with its Scenario's title, for the Item page.</summary>
public sealed record ItemScene(Guid ScenarioId, string ScenarioTitle, Guid SceneId, string SceneTitle, SceneStatus Status);

/// <summary>
/// Application port that answers the cross-aggregate questions about an Item's Scenes: is it linked to a Scene that is being or
/// has been played (spec.md, DELETE 409), and which Scenes link it. Implemented by Infrastructure (ADR 0022).
/// </summary>
public interface IItemUsage
{
    /// <summary>True when a link to the Item exists on an Active or Finished Scene of the Campaign.</summary>
    Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>The Scenes that link the Item, in Scenario order then Scene order (ADR 0014).</summary>
    Task<IReadOnlyList<ItemScene>> ListLinkedScenesAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);
}
