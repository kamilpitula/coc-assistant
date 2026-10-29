namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingSceneRepository : ISceneRepository
{
    private readonly ISceneRepository _inner;

    public RecordingSceneRepository(ISceneRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    /// <summary>When set, <see cref="SaveChangesAsync"/> fails as a database outage would.</summary>
    public bool FailSave { get; set; }

    /// <summary>When set, runs just before the inner save, so a test can play a second tab that wins the race.</summary>
    public Func<Task>? BeforeSave { get; set; }

    public void Add(Scene scene)
    {
        Calls.Add(nameof(Add));
        _inner.Add(scene);
    }

    public void Remove(Scene scene)
    {
        Calls.Add(nameof(Remove));
        _inner.Remove(scene);
    }

    public Task<IReadOnlyList<Scene>> ListForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListForScenarioAsync));
        return _inner.ListForScenarioAsync(campaignId, scenarioId, cancellationToken);
    }

    public Task<IReadOnlyList<Scene>> ListTrackedForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListTrackedForScenarioAsync));
        return _inner.ListTrackedForScenarioAsync(campaignId, scenarioId, cancellationToken);
    }

    public Task<Scene?> FindByIdAsync(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindByIdAsync));
        return _inner.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken);
    }

    public Task<Scene?> FindForPlayAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindForPlayAsync));
        return _inner.FindForPlayAsync(campaignId, sceneId, cancellationToken);
    }

    public Task<Scene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindActiveAsync));
        return _inner.FindActiveAsync(campaignId, cancellationToken);
    }

    public Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingNonPlayerEntityAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListTrackedPreparedLinkingNonPlayerEntityAsync));
        return _inner.ListTrackedPreparedLinkingNonPlayerEntityAsync(campaignId, type, nonPlayerEntityId, cancellationToken);
    }

    public Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingItemAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListTrackedPreparedLinkingItemAsync));
        return _inner.ListTrackedPreparedLinkingItemAsync(campaignId, itemId, cancellationToken);
    }

    public Task<int> MaxPositionAsync(Guid scenarioId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(MaxPositionAsync));
        return _inner.MaxPositionAsync(scenarioId, cancellationToken);
    }

    /// <summary>When set, runs inside a finish-then-start, after the finish is saved and before the start is applied.</summary>
    public Func<Task>? BetweenSaves { get; set; }

    public async Task SaveFinishThenStartAsync(Func<SceneTransitionOutcome> startScene, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveFinishThenStartAsync));
        if (BeforeSave is not null)
        {
            await BeforeSave();
        }

        await _inner.SaveFinishThenStartAsync(
            () =>
            {
                BetweenSaves?.Invoke().GetAwaiter().GetResult();
                return startScene();
            },
            cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        if (FailSave)
        {
            throw new InvalidOperationException("The database is down.");
        }

        return SaveInnerAsync(cancellationToken);
    }

    private async Task SaveInnerAsync(CancellationToken cancellationToken)
    {
        if (BeforeSave is not null)
        {
            await BeforeSave();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}
