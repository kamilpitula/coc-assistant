namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>
/// Resolves the registered handlers for each domain event from the request scope. Each handler
/// failure is logged and swallowed so the request and the other handlers are unaffected (ADR 0011).
/// </summary>
public sealed class ServiceProviderDomainEventDispatcher : IDomainEventDispatcher
{
    private static readonly ConcurrentDictionary<Type, EventHandlers> HandlersByEventType = new();

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ServiceProviderDomainEventDispatcher> _logger;

    public ServiceProviderDomainEventDispatcher(IServiceProvider serviceProvider, ILogger<ServiceProviderDomainEventDispatcher> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task DispatchAsync(IReadOnlyCollection<IDomainEvent> domainEvents, CancellationToken cancellationToken)
    {
        foreach (var domainEvent in domainEvents)
        {
            foreach (var handlerCall in ResolveHandlers(domainEvent))
            {
                await HandleSafelyAsync(handlerCall, domainEvent, cancellationToken);
            }
        }
    }

    private IReadOnlyList<HandlerCall> ResolveHandlers(IDomainEvent domainEvent)
    {
        var eventType = domainEvent.GetType();
        try
        {
            var handlers = HandlersByEventType.GetOrAdd(
                eventType,
                type => (EventHandlers)Activator.CreateInstance(typeof(EventHandlers<>).MakeGenericType(type))!);
            return handlers.Resolve(_serviceProvider, domainEvent);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Resolving domain event handlers failed for {EventType}.", eventType.Name);
            return [];
        }
    }

    private async Task HandleSafelyAsync(HandlerCall handlerCall, IDomainEvent domainEvent, CancellationToken cancellationToken)
    {
        try
        {
            await handlerCall.HandleAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Domain event handler {HandlerType} failed for {EventType}.",
                handlerCall.HandlerType.Name,
                domainEvent.GetType().Name);
        }
    }

    private sealed record HandlerCall(Type HandlerType, Func<CancellationToken, Task> HandleAsync);

    private abstract class EventHandlers
    {
        public abstract IReadOnlyList<HandlerCall> Resolve(IServiceProvider serviceProvider, IDomainEvent domainEvent);
    }

    private sealed class EventHandlers<TEvent> : EventHandlers
        where TEvent : IDomainEvent
    {
        public override IReadOnlyList<HandlerCall> Resolve(IServiceProvider serviceProvider, IDomainEvent domainEvent) =>
            serviceProvider.GetServices<IDomainEventHandler<TEvent>>()
                .Select(handler => new HandlerCall(
                    handler.GetType(),
                    cancellationToken => handler.HandleAsync((TEvent)domainEvent, cancellationToken)))
                .ToList();
    }
}
