namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Lists, reads, creates, edits, removes, and reorders a Scenario's Scenes for its Campaign's Keeper
/// (specs/scenario-preparation/spec.md). The Keeper check runs first on every operation, so a Player, another
/// Campaign's Keeper, a missing Campaign or Scenario, or a Scene of another Scenario all end as NotFound before any
/// Scene is read or written (ADR 0013, ADR 0016).
/// </summary>
public class SceneService
{
    private readonly ICampaignKeepers _keepers;
    private readonly IScenarioRepository _scenarios;
    private readonly ISceneRepository _scenes;
    private readonly TimeProvider _timeProvider;

    public SceneService(ICampaignKeepers keepers, IScenarioRepository scenarios, ISceneRepository scenes, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _scenarios = scenarios;
        _scenes = scenes;
        _timeProvider = timeProvider;
    }

    /// <summary>The Scenario's Scenes in prepared order; null when the caller may not see the Scenario.</summary>
    public async Task<IReadOnlyList<SceneSummaryView>?> ListAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, CancellationToken cancellationToken)
    {
        if (await FindScenarioAsync(campaignId, callerAccountId, scenarioId, cancellationToken) is null)
        {
            return null;
        }

        return ToSummaries(await _scenes.ListForScenarioAsync(campaignId, scenarioId, cancellationToken));
    }

    /// <summary>One Scene; null when the caller is not the Keeper or the Scene is not in this Scenario and Campaign.</summary>
    public async Task<SceneDetailView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        return scene is null ? null : ToDetail(scene);
    }

    /// <summary>Appends a Prepared Scene after the Scenario's existing ones.</summary>
    public async Task<SceneWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        string title,
        string? location,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        var scenario = await FindScenarioAsync(campaignId, callerAccountId, scenarioId, cancellationToken);
        if (scenario is null)
        {
            return new SceneWriteResult(SceneWriteOutcome.NotFound, null);
        }

        var position = await _scenes.MaxPositionAsync(scenarioId, cancellationToken) + 1;
        var creation = Scene.Create(scenario, title, location, keeperNotes, position, _timeProvider.GetUtcNow());
        if (creation.Scene is null)
        {
            return new SceneWriteResult(ToWriteOutcome(creation.Outcome), null);
        }

        _scenes.Add(creation.Scene);
        await _scenes.SaveChangesAsync(cancellationToken);
        return new SceneWriteResult(SceneWriteOutcome.Saved, ToDetail(creation.Scene));
    }

    /// <summary>Replaces a Scene's title, location, and Keeper notes; its place in the order is unchanged.</summary>
    public async Task<SceneWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        string title,
        string? location,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new SceneWriteResult(SceneWriteOutcome.NotFound, null);
        }

        var outcome = scene.Edit(title, location, keeperNotes);
        if (outcome != SceneFieldsOutcome.Accepted)
        {
            return new SceneWriteResult(ToWriteOutcome(outcome), null);
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return new SceneWriteResult(SceneWriteOutcome.Saved, ToDetail(scene));
    }

    /// <summary>Removes a Prepared Scene; an Active or Finished Scene is never removed.</summary>
    public async Task<SceneRemoveOutcome> RemoveAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return SceneRemoveOutcome.NotFound;
        }

        if (!scene.IsRemovable)
        {
            return SceneRemoveOutcome.NotPrepared;
        }

        _scenes.Remove(scene);
        await _scenes.SaveChangesAsync(cancellationToken);
        return SceneRemoveOutcome.Removed;
    }

    /// <summary>
    /// Applies the requested order of every Scene id in one save (ADR 0014). A request that is not exactly the
    /// Scenario's current set changes nothing.
    /// </summary>
    public async Task<SceneReorderResult> ReorderAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        IReadOnlyList<Guid> sceneIds,
        CancellationToken cancellationToken)
    {
        if (await FindScenarioAsync(campaignId, callerAccountId, scenarioId, cancellationToken) is null)
        {
            return new SceneReorderResult(SceneReorderOutcome.NotFound, null);
        }

        var current = await _scenes.ListTrackedForScenarioAsync(campaignId, scenarioId, cancellationToken);
        var outcome = SceneOrder.Apply(current, sceneIds);
        if (outcome != SceneOrderOutcome.Reordered)
        {
            return new SceneReorderResult(ToReorderOutcome(outcome), null);
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return new SceneReorderResult(SceneReorderOutcome.Reordered, ToSummaries(current.OrderBy(scene => scene.Position)));
    }

    private async Task<Scenario?> FindScenarioAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenarios.FindByIdAsync(campaignId, scenarioId, cancellationToken)
            : null;

    private async Task<Scene?> FindSceneAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken)
            : null;

    private static SceneSummaryView ToSummary(Scene scene) => new(scene.Id, scene.Title, scene.Status, scene.StartedAt, scene.FinishedAt);

    private static IReadOnlyList<SceneSummaryView> ToSummaries(IEnumerable<Scene> scenes) => scenes.Select(ToSummary).ToList();

    private static SceneDetailView ToDetail(Scene scene) =>
        new(scene.Id, scene.Title, scene.Location, scene.KeeperNotes, scene.Status, scene.StartedAt, scene.FinishedAt);

    private static SceneWriteOutcome ToWriteOutcome(SceneFieldsOutcome outcome) => outcome switch
    {
        SceneFieldsOutcome.InvalidTitle => SceneWriteOutcome.InvalidTitle,
        SceneFieldsOutcome.InvalidLocation => SceneWriteOutcome.InvalidLocation,
        SceneFieldsOutcome.SceneFinished => SceneWriteOutcome.Finished,
        _ => SceneWriteOutcome.InvalidKeeperNotes,
    };

    private static SceneReorderOutcome ToReorderOutcome(SceneOrderOutcome outcome) =>
        outcome == SceneOrderOutcome.DuplicateIds ? SceneReorderOutcome.DuplicateIds : SceneReorderOutcome.DoesNotMatchScenes;
}
