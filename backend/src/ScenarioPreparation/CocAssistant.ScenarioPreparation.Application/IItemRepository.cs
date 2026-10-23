namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for Item persistence, implemented by Infrastructure. Lookups filter Campaign and Item ids together, so an
/// Item of another Campaign is simply not found (ADR 0013). A found Item carries its Handouts.
/// </summary>
public interface IItemRepository
{
    void Add(Item item);

    void Remove(Item item);

    Task<Item?> FindByIdAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
