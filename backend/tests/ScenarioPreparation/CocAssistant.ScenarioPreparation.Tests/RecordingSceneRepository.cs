namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingSceneRepository : ISceneRepository
{
    private readonly ISceneRepository _inner;

    public RecordingSceneRepository(ISceneRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

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

    public Task<int> MaxPositionAsync(Guid scenarioId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(MaxPositionAsync));
        return _inner.MaxPositionAsync(scenarioId, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        return _inner.SaveChangesAsync(cancellationToken);
    }
}
