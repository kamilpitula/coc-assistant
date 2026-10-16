namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the audiences allowed to know about a Wall Entry change to refetch the Wall (specs/campaign-play/spec.md,
/// Live connection contract). The audience comes from <see cref="CampaignLivePublicationPolicy"/>.
/// </summary>
public sealed class PublishWallEntryChanges : IDomainEventHandler<WallEntryAdded>, IDomainEventHandler<WallEntryRemoved>
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishWallEntryChanges(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task HandleAsync(WallEntryAdded domainEvent, CancellationToken cancellationToken) =>
        PublishAsync(domainEvent.CampaignId, domainEvent.Visibility, cancellationToken);

    public Task HandleAsync(WallEntryRemoved domainEvent, CancellationToken cancellationToken) =>
        PublishAsync(domainEvent.CampaignId, domainEvent.Visibility, cancellationToken);

    private Task PublishAsync(Guid campaignId, WallEntryVisibility visibility, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForWallEntryChanged(campaignId, visibility),
            cancellationToken);
}
