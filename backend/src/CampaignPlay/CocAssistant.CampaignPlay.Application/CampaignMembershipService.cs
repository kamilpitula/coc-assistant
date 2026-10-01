namespace CocAssistant.CampaignPlay.Application;

/// <summary>Manages the active Campaign Invite for the Keeper and admits Players who join through it.</summary>
public class CampaignMembershipService
{
    private readonly ICampaignRepository _campaigns;
    private readonly TimeProvider _timeProvider;

    public CampaignMembershipService(ICampaignRepository campaigns, TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _timeProvider = timeProvider;
    }

    /// <summary>Returns the active Invite, issuing a fresh one only when none is active; null when not the Keeper.</summary>
    public async Task<CampaignInvite?> IssueInviteAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsKeeper(keeperAccountId))
        {
            return null;
        }

        if (campaign.ActiveInvite is not null)
        {
            return campaign.ActiveInvite;
        }

        var invite = campaign.IssueInvite(NewToken(), _timeProvider.GetUtcNow());
        await _campaigns.SaveChangesAsync(cancellationToken);
        return invite;
    }

    /// <summary>Replaces any active Invite with a freshly issued one bearing a new token; null when not the Keeper.</summary>
    public async Task<CampaignInvite?> ReplaceInviteAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsKeeper(keeperAccountId))
        {
            return null;
        }

        var invite = campaign.IssueInvite(NewToken(), _timeProvider.GetUtcNow());
        await _campaigns.SaveChangesAsync(cancellationToken);
        return invite;
    }

    /// <summary>Returns the Campaign's active Invite for its Keeper; null when not the Keeper or none is active.</summary>
    public async Task<CampaignInvite?> GetActiveInviteAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsKeeper(keeperAccountId))
        {
            return null;
        }

        return campaign.ActiveInvite;
    }

    /// <summary>Revokes the Campaign's active Invite for its Keeper.</summary>
    public async Task<RevokeInviteOutcome> RevokeInviteAsync(Guid campaignId, Guid keeperAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsKeeper(keeperAccountId))
        {
            return RevokeInviteOutcome.NotAuthorized;
        }

        if (!campaign.RevokeActiveInvite())
        {
            return RevokeInviteOutcome.NoActiveInvite;
        }

        await _campaigns.SaveChangesAsync(cancellationToken);
        return RevokeInviteOutcome.Revoked;
    }

    /// <summary>
    /// Admits an Account as a Player through the active Invite matching the token, enforcing the limit atomically.
    /// A lost optimistic-concurrency race re-reads fresh state and retries so open slots are still filled under contention.
    /// </summary>
    public async Task<JoinCampaignResult> JoinAsync(string token, Guid accountId, CancellationToken cancellationToken)
    {
        var attempt = 0;
        while (true)
        {
            var campaign = await _campaigns.FindByInviteTokenAsync(token, cancellationToken);
            if (campaign is null)
            {
                return new JoinCampaignResult(JoinCampaignOutcome.InvalidInvite, false, null);
            }

            var outcome = campaign.Join(accountId, token, _timeProvider.GetUtcNow());
            if (outcome == JoinCampaignOutcome.AlreadyMember)
            {
                return new JoinCampaignResult(outcome, false, campaign);
            }

            if (outcome != JoinCampaignOutcome.Joined)
            {
                return new JoinCampaignResult(outcome, false, null);
            }

            try
            {
                await _campaigns.SaveChangesAsync(cancellationToken);
                return new JoinCampaignResult(JoinCampaignOutcome.Joined, false, campaign);
            }
            catch (CampaignMembershipConflictException)
            {
                // Bound retries by the limit: each lost round means another join committed, so the slots cannot churn forever.
                if (++attempt > campaign.PlayerLimit)
                {
                    return new JoinCampaignResult(JoinCampaignOutcome.Joined, true, null);
                }

                _campaigns.DiscardPendingChanges();
            }
        }
    }

    private static string NewToken() => Guid.NewGuid().ToString("N");
}
