namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Campaign's connected members to refetch Roll Requests. Scene Play calls it after a Roll Request change has
/// committed in Scenario Preparation's database, which has no domain-event dispatcher (ADR 0024). The audience comes from
/// <see cref="CampaignLivePublicationPolicy"/>; delivery is best-effort like <see cref="ICampaignLiveUpdates"/>.
/// </summary>
public sealed class PublishRollRequestChanged
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishRollRequestChanged(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task PublishAsync(
        Guid campaignId,
        WallEntryVisibility visibility,
        IReadOnlyCollection<Guid> playerAccountIds,
        CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForRollRequestChanged(campaignId, visibility, playerAccountIds),
            cancellationToken);
}
