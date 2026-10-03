namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Subscribes connections to a Campaign's Presence and removes them again (specs/campaign-play/spec.md, Live
/// connection contract). Only Campaign Members are recorded, and each member transition is published through the
/// publication policy.
/// </summary>
public class CampaignPresenceService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IPresenceTracker _tracker;
    private readonly ICampaignLiveUpdates _liveUpdates;

    public CampaignPresenceService(ICampaignRepository campaigns, IPresenceTracker tracker, ICampaignLiveUpdates liveUpdates)
    {
        _campaigns = campaigns;
        _tracker = tracker;
        _liveUpdates = liveUpdates;
    }

    /// <summary>The Account's membership in the Campaign; null for a non-member or an unknown Campaign.</summary>
    public async Task<PresenceMembership?> FindMembershipAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        var role = campaign?.RoleOf(accountId);
        var memberId = campaign is null ? null : CampaignMemberIds.Of(campaign, accountId);
        return role is null || memberId is null ? null : new PresenceMembership(campaignId, memberId.Value, role.Value);
    }

    /// <summary>Records the member's subscribed connection, publishes a transition if any, and returns the snapshot.</summary>
    public async Task<PresenceSnapshot> OpenAsync(PresenceMembership membership, string connectionId, CancellationToken cancellationToken)
    {
        var transition = await _tracker.OpenAsync(membership.CampaignId, connectionId, membership.MemberId, cancellationToken);
        if (transition is not null)
        {
            await PublishAsync(new CampaignPresenceTransition(membership.CampaignId, transition), cancellationToken);
        }

        var connectedMembers = await _tracker.GetConnectedMembersAsync(membership.CampaignId, cancellationToken);
        return new PresenceSnapshot(membership.CampaignId, connectedMembers);
    }

    /// <summary>Removes a closed connection from every Campaign's Presence and publishes the resulting transitions.</summary>
    public async Task DisconnectAsync(string connectionId, CancellationToken cancellationToken)
    {
        foreach (var transition in await _tracker.CloseAsync(connectionId, cancellationToken))
        {
            await PublishAsync(transition, cancellationToken);
        }
    }

    private Task PublishAsync(CampaignPresenceTransition change, CancellationToken cancellationToken) =>
        _liveUpdates.PublishPresenceChangedAsync(
            CampaignLivePublicationPolicy.ForPresenceChanged(change.CampaignId),
            change.CampaignId,
            change.Transition,
            cancellationToken);
}
