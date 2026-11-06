namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>An Item an Investigator holds with the give Reveal that set the holder (ADR 0029).</summary>
public sealed record HeldItem(Item Item, Reveal GiveReveal);

/// <summary>
/// Application port for Item persistence, implemented by Infrastructure. Lookups filter Campaign and Item ids together, so an
/// Item of another Campaign is simply not found (ADR 0013). A found Item carries its Handouts.
/// </summary>
public interface IItemRepository
{
    void Add(Item item);

    void Remove(Item item);

    Task<Item?> FindByIdAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>The Campaign's Items linked to the Scene, change-tracked with their Handouts, in link order (CreatedAt, then Id).</summary>
    Task<IReadOnlyList<Item>> ListLinkedForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken);

    /// <summary>The Items the Investigator holds with their give Reveals, newest first (RevealedAt descending, then Id). Read-only.</summary>
    Task<IReadOnlyList<HeldItem>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
