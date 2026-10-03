namespace CocAssistant.CampaignPlay.Tests;

/// <summary>A handler whose construction fails, as a misconfigured dependency would.</summary>
public sealed class UnconstructableDomainEventHandler<TEvent> : IDomainEventHandler<TEvent>
    where TEvent : IDomainEvent
{
    public UnconstructableDomainEventHandler() => throw new InvalidOperationException("Handler could not be created.");

    public Task HandleAsync(TEvent domainEvent, CancellationToken cancellationToken) => Task.CompletedTask;
}
