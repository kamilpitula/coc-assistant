namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for Scene persistence, implemented by Infrastructure. Every lookup filters Campaign, Scenario, and
/// Scene ids together, so a Scene of another Scenario or Campaign is simply not found (ADR 0016).
/// </summary>
public interface ISceneRepository
{
    void Add(Scene scene);

    void Remove(Scene scene);

    /// <summary>The Scenario's Scenes in prepared order: Position, then CreatedAt, then Id (ADR 0014). Read-only.</summary>
    Task<IReadOnlyList<Scene>> ListForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken);

    /// <summary>The same Scenes, change-tracked so a reorder can be saved.</summary>
    Task<IReadOnlyList<Scene>> ListTrackedForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken);

    Task<Scene?> FindByIdAsync(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken);

    /// <summary>The highest Position in the Scenario; 0 when it has no Scenes.</summary>
    Task<int> MaxPositionAsync(Guid scenarioId, CancellationToken cancellationToken);

    /// <summary>Saves the changes. Throws <see cref="ItemLinkConflictException"/> when the same Item was linked to the Scene concurrently.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
