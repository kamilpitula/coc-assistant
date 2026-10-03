namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Collects the domain events that reached a handler or dispatcher.</summary>
public sealed class DomainEventRecorder
{
    public List<IDomainEvent> Handled { get; } = [];
}
