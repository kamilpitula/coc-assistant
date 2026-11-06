namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Scene that links an Item, with its Scenario's title, for the Item page.</summary>
public sealed record ItemScene(Guid ScenarioId, string ScenarioTitle, Guid SceneId, string SceneTitle, SceneStatus Status);

/// <summary>
/// Application port that answers the cross-aggregate questions about an Item's Scenes and Reveals: is it linked to a Scene that
/// is being or has been played, or has it or one of its Handouts been revealed (ADR 0022, ADR 0029). Implemented by
/// Infrastructure. Who holds the Item is stored on the Item itself; callers OR this with the holder.
/// </summary>
public interface IItemUsage
{
    /// <summary>True when a link to the Item exists on an Active or Finished Scene of the Campaign, or a Reveal exists of the Item or of one of its Handouts.</summary>
    Task<bool> IsPlayedAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>The Scenes that link the Item, in Scenario order then Scene order (ADR 0014).</summary>
    Task<IReadOnlyList<ItemScene>> ListLinkedScenesAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);
}
