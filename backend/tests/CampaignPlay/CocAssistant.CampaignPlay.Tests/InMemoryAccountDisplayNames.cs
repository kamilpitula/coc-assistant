namespace CocAssistant.CampaignPlay.Tests;

/// <summary>An in-memory stand-in for the Identity-backed display-name port (ADR 0008).</summary>
public sealed class InMemoryAccountDisplayNames : IAccountDisplayNames
{
    private readonly Dictionary<Guid, string> _names = new()
    {
        [CampaignPlayScenario.KeeperAccountId] = "Kate Keeper",
        [CampaignPlayScenario.PlayerAccountId] = "Ada Lovelace",
        [CampaignPlayScenario.OtherPlayerAccountId] = "Harvey Walters",
    };

    /// <summary>Adds or replaces the display name of an Account.</summary>
    public InMemoryAccountDisplayNames With(Guid accountId, string displayName)
    {
        _names[accountId] = displayName;
        return this;
    }

    public Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyDictionary<Guid, string>>(
            accountIds.Where(_names.ContainsKey).Distinct().ToDictionary(id => id, id => _names[id]));
}
