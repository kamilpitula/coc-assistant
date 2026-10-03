namespace CocAssistant.CampaignPlay.Tests;

/// <summary>In-memory dispatcher that records each dispatch call (ADR 0011).</summary>
public sealed class RecordingDomainEventDispatcher : IDomainEventDispatcher
{
    public List<IReadOnlyCollection<IDomainEvent>> Dispatches { get; } = [];

    public IEnumerable<IDomainEvent> Dispatched => Dispatches.SelectMany(dispatch => dispatch);

    public Task DispatchAsync(IReadOnlyCollection<IDomainEvent> domainEvents, CancellationToken cancellationToken)
    {
        Dispatches.Add(domainEvents);
        return Task.CompletedTask;
    }
}
