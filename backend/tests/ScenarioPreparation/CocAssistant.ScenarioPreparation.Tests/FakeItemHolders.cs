namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// An in-memory <see cref="IItemHolders"/>: nobody holds anything until a holder is registered, and each question is recorded,
/// so tests can cover a held Item before Scene Play exists (PBI-SP-008 D1).
/// </summary>
public sealed class FakeItemHolders : IItemHolders
{
    private readonly Dictionary<Guid, ItemHolder> _holders = [];

    public List<(Guid CampaignId, Guid ItemId)> Calls { get; } = [];

    public void Hold(Guid itemId, Guid investigatorId) => _holders[itemId] = new ItemHolder(investigatorId);

    public Task<ItemHolder?> FindHolderAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add((campaignId, itemId));
        return Task.FromResult(_holders.GetValueOrDefault(itemId));
    }
}
