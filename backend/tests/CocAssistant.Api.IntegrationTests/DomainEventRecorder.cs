namespace CocAssistant.Api.IntegrationTests;

/// <summary>Collects the domain events that reached the recording handler.</summary>
public sealed class DomainEventRecorder
{
    private readonly ConcurrentQueue<IDomainEvent> _handled = new();

    public IReadOnlyList<IDomainEvent> Handled => _handled.ToList();

    public void Record(IDomainEvent domainEvent) => _handled.Enqueue(domainEvent);

    public void Clear() => _handled.Clear();
}
