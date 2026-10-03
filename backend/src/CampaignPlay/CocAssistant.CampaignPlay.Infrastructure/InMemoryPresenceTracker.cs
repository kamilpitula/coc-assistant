namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>
/// Holds every Campaign's <see cref="CampaignPresence"/> in API memory and adds only thread safety, so the API runs as
/// a single replica until a shared adapter replaces this one (ADR 0010). Presence is not persisted.
/// </summary>
public sealed class InMemoryPresenceTracker : IPresenceTracker
{
    private readonly Lock _lock = new();
    private readonly Dictionary<Guid, CampaignPresence> _presenceByCampaign = [];
    private readonly Dictionary<string, HashSet<Guid>> _campaignsByConnection = new(StringComparer.Ordinal);

    public Task<PresenceTransition?> OpenAsync(Guid campaignId, string connectionId, Guid memberId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            if (!_presenceByCampaign.TryGetValue(campaignId, out var presence))
            {
                presence = new CampaignPresence();
                _presenceByCampaign[campaignId] = presence;
            }

            if (!_campaignsByConnection.TryGetValue(connectionId, out var campaigns))
            {
                campaigns = [];
                _campaignsByConnection[connectionId] = campaigns;
            }

            campaigns.Add(campaignId);
            return Task.FromResult(presence.Open(connectionId, memberId));
        }
    }

    public Task<IReadOnlyList<CampaignPresenceTransition>> CloseAsync(string connectionId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            if (!_campaignsByConnection.Remove(connectionId, out var campaigns))
            {
                return Task.FromResult<IReadOnlyList<CampaignPresenceTransition>>([]);
            }

            var transitions = campaigns
                .Select(campaignId => CloseInCampaign(campaignId, connectionId))
                .OfType<CampaignPresenceTransition>()
                .ToList();
            return Task.FromResult<IReadOnlyList<CampaignPresenceTransition>>(transitions);
        }
    }

    public Task<IReadOnlyCollection<Guid>> GetConnectedMembersAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            IReadOnlyCollection<Guid> members = _presenceByCampaign.TryGetValue(campaignId, out var presence)
                ? presence.ConnectedMembers
                : [];
            return Task.FromResult(members);
        }
    }

    private CampaignPresenceTransition? CloseInCampaign(Guid campaignId, string connectionId)
    {
        var presence = _presenceByCampaign[campaignId];
        var transition = presence.Close(connectionId);
        if (presence.IsEmpty)
        {
            _presenceByCampaign.Remove(campaignId);
        }

        return transition is null ? null : new CampaignPresenceTransition(campaignId, transition);
    }
}
