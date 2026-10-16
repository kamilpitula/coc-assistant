namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Application port for Scenario persistence, implemented by Infrastructure. Every lookup is scoped to a Campaign.</summary>
public interface IScenarioRepository
{
    void Add(Scenario scenario);

    /// <summary>The Campaign's Scenarios in Campaign order: Position, then CreatedAt, then Id (ADR 0014). Read-only.</summary>
    Task<IReadOnlyList<Scenario>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken);

    /// <summary>The same Scenarios, change-tracked so a reorder can be saved.</summary>
    Task<IReadOnlyList<Scenario>> ListTrackedForCampaignAsync(Guid campaignId, CancellationToken cancellationToken);

    Task<Scenario?> FindByIdAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken);

    /// <summary>The highest Position in the Campaign; 0 when it has no Scenarios.</summary>
    Task<int> MaxPositionAsync(Guid campaignId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
