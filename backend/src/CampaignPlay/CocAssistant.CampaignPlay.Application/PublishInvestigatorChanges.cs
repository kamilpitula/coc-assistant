namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Tells the Keeper and the owning Player to refetch after an Investigator is created, submitted, approved, sent back
/// for changes, or started over; an approval also tells the Campaign its roster changed. The audiences come from
/// <see cref="CampaignLivePublicationPolicy"/>.
/// </summary>
public sealed class PublishInvestigatorChanges :
    IDomainEventHandler<InvestigatorCreated>,
    IDomainEventHandler<InvestigatorSubmitted>,
    IDomainEventHandler<InvestigatorApproved>,
    IDomainEventHandler<InvestigatorChangesRequested>,
    IDomainEventHandler<InvestigatorStartedOver>
{
    private readonly ICampaignLiveUpdates _liveUpdates;

    public PublishInvestigatorChanges(ICampaignLiveUpdates liveUpdates)
    {
        _liveUpdates = liveUpdates;
    }

    public Task HandleAsync(InvestigatorCreated domainEvent, CancellationToken cancellationToken) =>
        PublishChangedAsync(domainEvent.CampaignId, domainEvent.PlayerAccountId, cancellationToken);

    public Task HandleAsync(InvestigatorSubmitted domainEvent, CancellationToken cancellationToken) =>
        PublishChangedAsync(domainEvent.CampaignId, domainEvent.PlayerAccountId, cancellationToken);

    public Task HandleAsync(InvestigatorChangesRequested domainEvent, CancellationToken cancellationToken) =>
        PublishChangedAsync(domainEvent.CampaignId, domainEvent.PlayerAccountId, cancellationToken);

    public Task HandleAsync(InvestigatorStartedOver domainEvent, CancellationToken cancellationToken) =>
        PublishChangedAsync(domainEvent.CampaignId, domainEvent.PlayerAccountId, cancellationToken);

    public Task HandleAsync(InvestigatorApproved domainEvent, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            domainEvent.CampaignId,
            CampaignLivePublicationPolicy.ForInvestigatorApproved(domainEvent.CampaignId, domainEvent.PlayerAccountId),
            cancellationToken);

    private Task PublishChangedAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken) =>
        LivePublicationSender.PublishAllAsync(
            _liveUpdates,
            campaignId,
            CampaignLivePublicationPolicy.ForInvestigatorChanged(campaignId, playerAccountId),
            cancellationToken);
}
