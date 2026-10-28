namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingItemRepository : IItemRepository
{
    private readonly IItemRepository _inner;

    public RecordingItemRepository(IItemRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    /// <summary>When set, <see cref="SaveChangesAsync"/> fails as a database outage would.</summary>
    public bool FailSave { get; set; }

    public void Add(Item item)
    {
        Calls.Add(nameof(Add));
        _inner.Add(item);
    }

    public void Remove(Item item)
    {
        Calls.Add(nameof(Remove));
        _inner.Remove(item);
    }

    public Task<Item?> FindByIdAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindByIdAsync));
        return _inner.FindByIdAsync(campaignId, itemId, cancellationToken);
    }

    /// <summary>When set, runs just before the inner save, so a test can play a Scene start that wins the race.</summary>
    public Func<Task>? BeforeSave { get; set; }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        if (FailSave)
        {
            throw new InvalidOperationException("The database is down.");
        }

        if (BeforeSave is not null)
        {
            await BeforeSave();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Records usage questions, so tests can prove a refused caller read no usage.</summary>
public sealed class RecordingItemUsage : IItemUsage
{
    private readonly IItemUsage _inner;

    public RecordingItemUsage(IItemUsage inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(IsLinkedToPlayedSceneAsync));
        return _inner.IsLinkedToPlayedSceneAsync(campaignId, itemId, cancellationToken);
    }

    public Task<IReadOnlyList<ItemScene>> ListLinkedScenesAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListLinkedScenesAsync));
        return _inner.ListLinkedScenesAsync(campaignId, itemId, cancellationToken);
    }
}

/// <summary>Records list calls, so tests can prove a refused caller read no Item.</summary>
public sealed class RecordingItemDirectory : IItemDirectory
{
    private readonly IItemDirectory _inner;

    public RecordingItemDirectory(IItemDirectory inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public Task<IReadOnlyList<ItemSummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListForCampaignAsync));
        return _inner.ListForCampaignAsync(campaignId, cancellationToken);
    }
}
