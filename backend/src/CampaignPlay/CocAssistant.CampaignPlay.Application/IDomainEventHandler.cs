namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Reacts in-process to a committed domain event (ADR 0011). A handler must not change aggregates
/// in the same unit of work; a handler that needs to write starts its own use case.
/// </summary>
public interface IDomainEventHandler<in TEvent>
    where TEvent : IDomainEvent
{
    Task HandleAsync(TEvent domainEvent, CancellationToken cancellationToken);
}
