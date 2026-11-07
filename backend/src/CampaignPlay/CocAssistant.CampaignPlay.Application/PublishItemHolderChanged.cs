namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Keeper and the gaining and losing Players to refetch after an Item holder change has committed in Scenario Preparation's
/// database, which has no domain-event dispatcher (ADR 0024). The audiences come from
/// <see cref="CampaignLivePublicationPolicy.ForItemHolderChanged"/>; the Campaign is never told.
/// Delivery is best-effort like <see cref="ICampaignLiveUpdates"/>.
/// </summary>
public sealed class PublishItemHolderChanged
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishItemHolderChanged(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task PublishAsync(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForItemHolderChanged(campaignId, gainerAccountId, loserAccountId),
            cancellationToken);
}
