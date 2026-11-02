namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Keeper and the targeted Players to refetch after a Reveal has committed in Scenario Preparation's database, which has no
/// domain-event dispatcher (ADR 0024). The audiences come from <see cref="CampaignLivePublicationPolicy"/>; the Campaign is never told.
/// Delivery is best-effort like <see cref="ICampaignLiveUpdates"/>.
/// </summary>
public sealed class PublishRevealMade
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishRevealMade(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task PublishAsync(Guid campaignId, IReadOnlyCollection<Guid> recipientAccountIds, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForRevealMade(campaignId, recipientAccountIds),
            cancellationToken);
}
