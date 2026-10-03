namespace CocAssistant.Api.IntegrationTests;

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
        _recorder.Record(domainEvent);
        return Task.CompletedTask;
    }
}
