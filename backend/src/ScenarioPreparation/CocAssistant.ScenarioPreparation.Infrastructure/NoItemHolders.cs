namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// The placeholder <see cref="IItemHolders"/> until PBI-SPL-003: no one holds any Item, because Scene Play cannot give one yet
/// (ADR 0022). PBI-SPL-003 registers its own adapter in place of this one.
/// </summary>
public sealed class NoItemHolders : IItemHolders
{
    public Task<ItemHolder?> FindHolderAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken) =>
        Task.FromResult<ItemHolder?>(null);
}
