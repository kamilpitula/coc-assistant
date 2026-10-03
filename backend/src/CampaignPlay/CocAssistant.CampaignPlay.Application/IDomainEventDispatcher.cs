namespace CocAssistant.CampaignPlay.Application;

/// <summary>Delivers committed domain events to their handlers; a handler failure never reaches the caller (ADR 0011).</summary>
public interface IDomainEventDispatcher
{
    Task DispatchAsync(IReadOnlyCollection<IDomainEvent> domainEvents, CancellationToken cancellationToken);
}
