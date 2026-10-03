namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells connected Campaign Members to refetch the roster after a Player joins, so the new Player appears without a
/// reload (specs/campaign-play/spec.md, Scenario "A Player who joins appears to connected members").
/// </summary>
public sealed class PublishMembersChangedOnPlayerJoined : IDomainEventHandler<PlayerJoinedCampaign>
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishMembersChangedOnPlayerJoined(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task HandleAsync(PlayerJoinedCampaign domainEvent, CancellationToken cancellationToken) =>
        _liveUpdates.PublishCampaignDataChangedAsync(
            CampaignLivePublicationPolicy.ForMembersChanged(domainEvent.CampaignId),
            domainEvent.CampaignId,
            [CampaignDataTopic.Members],
            cancellationToken);
}
