namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// The provider side of Scene Play's command port (ADR 0024): reads the Campaign's Scenes by Campaign and Scene id, starts, finishes,
/// and re-staffs them. It performs no authorization; Scene Play checks the Keeper before it calls (ADR 0024), and no Scenario
/// Preparation endpoint calls it. Finish, start, and the present list are written in one save, and a lost race is reported
/// as a conflict, never retried (ADR 0025).
/// </summary>
public class SceneLifecycleService
{
    private readonly ISceneRepository _scenes;
    private readonly IScenarioRepository _scenarios;
    private readonly TimeProvider _timeProvider;

    public SceneLifecycleService(ISceneRepository scenes, IScenarioRepository scenarios, TimeProvider timeProvider)
    {
        _scenes = scenes;
        _scenarios = scenarios;
        _timeProvider = timeProvider;
    }

    /// <summary>The Campaign's Active Scene; null when none is Active.</summary>
    public async Task<PlayableSceneView?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var scene = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        return scene is null ? null : await ToViewAsync(scene, cancellationToken);
    }

    /// <summary>A Scene of any Scenario of the Campaign; null when it is not in the Campaign.</summary>
    public async Task<PlayableSceneView?> FindAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken)
    {
        var scene = await _scenes.FindForPlayAsync(campaignId, sceneId, cancellationToken);
        return scene is null ? null : await ToViewAsync(scene, cancellationToken);
    }

    /// <summary>
    /// Starts a Prepared Scene with the Investigators present, finishing the Active Scene in the same save when asked. Checks run in
    /// this order: the Scene exists, it is Prepared, no other Scene is Active (unless it is to be finished), then the present list.
    /// </summary>
    public async Task<SceneStartResult> StartAsync(
        Guid campaignId,
        Guid sceneId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        bool finishActiveScene,
        CancellationToken cancellationToken)
    {
        // The Active Scene is tracked first, so its Finished update is written before the new Scene's Active one (ADR 0025).
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        var scene = await _scenes.FindForPlayAsync(campaignId, sceneId, cancellationToken);
        if (scene is null)
        {
            return Refused(SceneStartOutcome.SceneNotFound);
        }

        if (scene.Status != SceneStatus.Prepared)
        {
            return Refused(SceneStartOutcome.NotPrepared);
        }

        if (active is not null && !finishActiveScene)
        {
            return Refused(SceneStartOutcome.ActiveSceneExists);
        }

        // Every refusal is decided before the first write, so a refused start finishes nothing.
        var check = scene.CheckStart(presentInvestigatorIds, approvedInvestigatorIds);
        if (check != SceneTransitionOutcome.Transitioned)
        {
            return Refused(ToStartOutcome(check));
        }

        var now = _timeProvider.GetUtcNow();
        if (!await TryWriteStartAsync(scene, active, now, presentInvestigatorIds, approvedInvestigatorIds, cancellationToken))
        {
            return Refused(SceneStartOutcome.Conflict);
        }

        var finished = active is null ? null : await ToViewAsync(active, cancellationToken);
        return new SceneStartResult(SceneStartOutcome.Started, await ToViewAsync(scene, cancellationToken), finished);
    }

    /// <summary>Finishes the Campaign's Active Scene.</summary>
    public async Task<SceneFinishResult> FinishActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return new SceneFinishResult(SceneFinishOutcome.NoActiveScene, null);
        }

        active.Finish(_timeProvider.GetUtcNow());
        return await TrySaveAsync(cancellationToken)
            ? new SceneFinishResult(SceneFinishOutcome.Finished, await ToViewAsync(active, cancellationToken))
            : new SceneFinishResult(SceneFinishOutcome.Conflict, null);
    }

    /// <summary>Replaces the Investigators present of the Active Scene under the start rules.</summary>
    public async Task<InvestigatorsPresentResult> ReplaceInvestigatorsPresentAsync(
        Guid campaignId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return new InvestigatorsPresentResult(InvestigatorsPresentOutcome.NoActiveScene, null);
        }

        var outcome = active.ReplaceInvestigatorsPresent(presentInvestigatorIds, approvedInvestigatorIds);
        if (outcome != SceneTransitionOutcome.Transitioned)
        {
            return new InvestigatorsPresentResult(ToPresentOutcome(outcome), null);
        }

        return await TrySaveAsync(cancellationToken)
            ? new InvestigatorsPresentResult(InvestigatorsPresentOutcome.Replaced, await ToViewAsync(active, cancellationToken))
            : new InvestigatorsPresentResult(InvestigatorsPresentOutcome.Conflict, null);
    }

    // A plain start is one save; finish-then-start is one transaction with two ordered saves (ADR 0025).
    private Task<bool> TryWriteStartAsync(
        Scene scene,
        Scene? active,
        DateTimeOffset now,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken)
    {
        if (active is null)
        {
            scene.Start(now, presentInvestigatorIds, approvedInvestigatorIds);
            return TrySaveAsync(() => _scenes.SaveChangesAsync(cancellationToken));
        }

        active.Finish(now);
        return TrySaveAsync(() => _scenes.SaveFinishThenStartAsync(() => scene.Start(now, presentInvestigatorIds, approvedInvestigatorIds), cancellationToken));
    }

    private Task<bool> TrySaveAsync(CancellationToken cancellationToken) => TrySaveAsync(() => _scenes.SaveChangesAsync(cancellationToken));

    private static async Task<bool> TrySaveAsync(Func<Task> save)
    {
        try
        {
            await save();
            return true;
        }
        catch (Exception exception) when (exception is ActiveSceneConflictException or SceneConcurrencyException)
        {
            return false;
        }
    }

    private async Task<PlayableSceneView> ToViewAsync(Scene scene, CancellationToken cancellationToken)
    {
        var scenario = await _scenarios.FindByIdAsync(scene.CampaignId, scene.ScenarioId, cancellationToken);
        return new PlayableSceneView(
            scene.Id,
            scene.ScenarioId,
            scenario?.Title ?? string.Empty,
            scene.Title,
            scene.Location,
            scene.Status,
            scene.StartedAt,
            scene.FinishedAt,
            scene.InvestigatorsPresent);
    }

    private static SceneStartResult Refused(SceneStartOutcome outcome) => new(outcome, null, null);

    private static SceneStartOutcome ToStartOutcome(SceneTransitionOutcome outcome) => outcome switch
    {
        SceneTransitionOutcome.NoInvestigatorPresent => SceneStartOutcome.NoInvestigatorPresent,
        SceneTransitionOutcome.DuplicateInvestigator => SceneStartOutcome.DuplicateInvestigator,
        SceneTransitionOutcome.InvestigatorNotApproved => SceneStartOutcome.InvestigatorNotApproved,
        _ => SceneStartOutcome.NotPrepared,
    };

    private static InvestigatorsPresentOutcome ToPresentOutcome(SceneTransitionOutcome outcome) => outcome switch
    {
        SceneTransitionOutcome.NoInvestigatorPresent => InvestigatorsPresentOutcome.NoInvestigatorPresent,
        SceneTransitionOutcome.DuplicateInvestigator => InvestigatorsPresentOutcome.DuplicateInvestigator,
        SceneTransitionOutcome.InvestigatorNotApproved => InvestigatorsPresentOutcome.InvestigatorNotApproved,
        _ => InvestigatorsPresentOutcome.NoActiveScene,
    };
}
