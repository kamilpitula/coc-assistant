namespace CocAssistant.CampaignPlay.Tests;

public sealed class ThrowingDomainEventHandler<TEvent> : IDomainEventHandler<TEvent>
    where TEvent : IDomainEvent
{
    public Task HandleAsync(TEvent domainEvent, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Handler failed.");
}
