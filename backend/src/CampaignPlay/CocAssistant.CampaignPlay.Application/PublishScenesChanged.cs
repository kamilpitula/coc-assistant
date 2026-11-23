namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Keeper's other tabs to refetch after Scene content has committed in Scenario Preparation's database, which has no
/// domain-event dispatcher (ADR 0036). The audience comes from <see cref="CampaignLivePublicationPolicy"/>; a Player never
/// hears it. Delivery is best-effort like <see cref="ICampaignLiveUpdates"/>.
/// </summary>
public sealed class PublishScenesChanged
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishScenesChanged(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task PublishAsync(Guid campaignId, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForScenesChanged(campaignId),
            cancellationToken);
}
