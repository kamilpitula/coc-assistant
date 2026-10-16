namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingScenarioRepository : IScenarioRepository
{
    private readonly IScenarioRepository _inner;

    public RecordingScenarioRepository(IScenarioRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public void Add(Scenario scenario)
    {
        Calls.Add(nameof(Add));
        _inner.Add(scenario);
    }

    public Task<IReadOnlyList<Scenario>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListForCampaignAsync));
        return _inner.ListForCampaignAsync(campaignId, cancellationToken);
    }

    public Task<IReadOnlyList<Scenario>> ListTrackedForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListTrackedForCampaignAsync));
        return _inner.ListTrackedForCampaignAsync(campaignId, cancellationToken);
    }

    public Task<Scenario?> FindByIdAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindByIdAsync));
        return _inner.FindByIdAsync(campaignId, scenarioId, cancellationToken);
    }

    public Task<int> MaxPositionAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(MaxPositionAsync));
        return _inner.MaxPositionAsync(campaignId, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        return _inner.SaveChangesAsync(cancellationToken);
    }
}
