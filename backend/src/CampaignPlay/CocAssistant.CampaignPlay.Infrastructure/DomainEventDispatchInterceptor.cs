namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>
/// Dispatches the domain events of tracked aggregates only after SaveChangesAsync commits, then
/// clears them (ADR 0011). A failed or canceled save dispatches nothing.
/// </summary>
public sealed class DomainEventDispatchInterceptor : SaveChangesInterceptor
{
    private readonly IDomainEventDispatcher _dispatcher;
    private IReadOnlyList<AggregateRoot> _pendingAggregates = [];

    public DomainEventDispatchInterceptor(IDomainEventDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        // Dispatch is async; refusing before commit avoids blocking and losing events.
        if (AggregatesWithEvents(eventData.Context).Count > 0)
        {
            throw new InvalidOperationException("Aggregates with domain events must be saved with SaveChangesAsync (ADR 0011).");
        }

        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        // Captured before saving so aggregates detached by the save are still included. Each save
        // replaces the snapshot, so a failed attempt's aggregates are never dispatched.
        _pendingAggregates = AggregatesWithEvents(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var aggregates = TakePendingAggregates();
        var domainEvents = aggregates.SelectMany(aggregate => aggregate.DomainEvents).ToList();
        foreach (var aggregate in aggregates)
        {
            aggregate.ClearDomainEvents();
        }

        if (domainEvents.Count > 0)
        {
            await _dispatcher.DispatchAsync(domainEvents, cancellationToken);
        }

        return result;
    }

    private IReadOnlyList<AggregateRoot> TakePendingAggregates()
    {
        var aggregates = _pendingAggregates;
        _pendingAggregates = [];
        return aggregates;
    }

    private static IReadOnlyList<AggregateRoot> AggregatesWithEvents(DbContext? context) =>
        context is null
            ? []
            : context.ChangeTracker.Entries<AggregateRoot>()
                .Select(entry => entry.Entity)
                .Where(aggregate => aggregate.DomainEvents.Count > 0)
                .ToList();
}
