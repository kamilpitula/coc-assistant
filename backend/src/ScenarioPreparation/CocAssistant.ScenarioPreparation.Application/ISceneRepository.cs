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

    /// <summary>
    /// A Scene of any Scenario of the Campaign, change-tracked with its links, Handouts, and Investigators present. Scene Play
    /// reaches Scenes by Campaign and Scene id only (ADR 0016, ADR 0024).
    /// </summary>
    Task<Scene?> FindForPlayAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken);

    /// <summary>The Campaign's Active Scene, change-tracked like <see cref="FindForPlayAsync"/>; null when none is Active.</summary>
    Task<Scene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken);

    /// <summary>The Campaign's Prepared Scenes that link the Human NPC or Mythos Creature, change-tracked (ADR 0025, D6).</summary>
    Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingNonPlayerEntityAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken);

    /// <summary>The Campaign's Prepared Scenes that link the Item, change-tracked (ADR 0025, D6).</summary>
    Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingItemAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the tracked finish of the Active Scene, then runs <paramref name="startScene"/> and saves the start with its present rows,
    /// in one database transaction (ADR 0025). The two saves are ordered because the one-Active-Scene index is checked per statement.
    /// <paramref name="startScene"/> must return <see cref="SceneTransitionOutcome.Transitioned"/>; anything else throws
    /// <see cref="InvalidOperationException"/>. On failure everything is rolled back and the exceptions of <see cref="SaveChangesAsync"/> are thrown.
    /// </summary>
    Task SaveFinishThenStartAsync(Func<SceneTransitionOutcome> startScene, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the changes. Throws <see cref="ItemLinkConflictException"/> when the same Item was linked to the Scene concurrently,
    /// <see cref="ActiveSceneConflictException"/> when another Scene of the Campaign became Active, and
    /// <see cref="SceneConcurrencyException"/> when a Scene's version changed since it was read.
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
