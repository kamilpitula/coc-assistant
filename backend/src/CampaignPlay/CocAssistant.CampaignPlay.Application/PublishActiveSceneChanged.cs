namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Campaign's connected members to refetch the Active Scene. Scene Play calls it after a Scene transition has committed
/// in Scenario Preparation's database, which has no domain-event dispatcher (ADR 0024). The audience comes from
/// <see cref="CampaignLivePublicationPolicy"/>; delivery is best-effort like <see cref="ICampaignLiveUpdates"/>.
/// </summary>
public sealed class PublishActiveSceneChanged
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishActiveSceneChanged(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task PublishAsync(Guid campaignId, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForActiveSceneChanged(campaignId),
            cancellationToken);
}
