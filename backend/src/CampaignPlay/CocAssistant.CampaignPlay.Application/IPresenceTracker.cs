namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Application port that holds Presence for every Campaign (ADR 0010). The first adapter keeps it in API memory;
/// a shared adapter can replace it without changing <see cref="CampaignPresence"/> or its callers.
/// </summary>
public interface IPresenceTracker
{
    /// <summary>Records a subscribed connection of a member; returns the member's transition, if any.</summary>
    Task<PresenceTransition?> OpenAsync(Guid campaignId, string connectionId, Guid memberId, CancellationToken cancellationToken);

    /// <summary>Forgets a closed connection in every Campaign it subscribed to; returns the resulting transitions.</summary>
    Task<IReadOnlyList<CampaignPresenceTransition>> CloseAsync(string connectionId, CancellationToken cancellationToken);

    /// <summary>The memberIds of the Campaign's members that have at least one open connection.</summary>
    Task<IReadOnlyCollection<Guid>> GetConnectedMembersAsync(Guid campaignId, CancellationToken cancellationToken);
}
