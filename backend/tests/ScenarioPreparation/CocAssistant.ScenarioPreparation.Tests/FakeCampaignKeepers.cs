namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>In-memory <see cref="ICampaignKeepers"/>: only the registered (Campaign, Account) pairs are Keepers.</summary>
public sealed class FakeCampaignKeepers : ICampaignKeepers
{
    private readonly HashSet<(Guid CampaignId, Guid AccountId)> _keepers = [];

    public void Register(Guid campaignId, Guid accountId) => _keepers.Add((campaignId, accountId));

    public Task<bool> IsKeeperAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken) =>
        Task.FromResult(_keepers.Contains((campaignId, accountId)));
}
