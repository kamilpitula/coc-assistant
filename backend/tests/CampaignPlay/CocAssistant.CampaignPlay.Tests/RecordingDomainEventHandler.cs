namespace CocAssistant.CampaignPlay.Tests;

public sealed class RecordingDomainEventHandler<TEvent> : IDomainEventHandler<TEvent>
    where TEvent : IDomainEvent
{
    private readonly DomainEventRecorder _recorder;

    public RecordingDomainEventHandler(DomainEventRecorder recorder)
    {
        _recorder = recorder;
    }

    public Task HandleAsync(TEvent domainEvent, CancellationToken cancellationToken)
    {
        _recorder.Handled.Add(domainEvent);
        return Task.CompletedTask;
    }
}
