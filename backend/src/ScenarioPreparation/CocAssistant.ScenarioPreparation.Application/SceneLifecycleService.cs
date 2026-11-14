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
    private readonly ISceneRollRequestRepository _requests;
    private readonly TimeProvider _timeProvider;

    public SceneLifecycleService(
        ISceneRepository scenes,
        IScenarioRepository scenarios,
        ISceneRollRequestRepository requests,
        TimeProvider timeProvider)
    {
        _scenes = scenes;
        _scenarios = scenarios;
        _requests = requests;
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
    /// The Campaign's played Scenes (Active and Finished), newest StartedAt first, with their Scenario titles from a single
    /// Scenario lookup.
    /// </summary>
    public async Task<IReadOnlyList<PlayableSceneView>> ListPlayedAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var scenes = await _scenes.ListPlayedAsync(campaignId, cancellationToken);
        var titles = (await _scenarios.ListForCampaignAsync(campaignId, cancellationToken)).ToDictionary(scenario => scenario.Id, scenario => scenario.Title);
        return scenes.Select(scene => ToView(scene, titles.GetValueOrDefault(scene.ScenarioId) ?? string.Empty)).ToList();
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
        var (saved, cancelled) = await TryWriteStartAsync(campaignId, scene, active, now, presentInvestigatorIds, approvedInvestigatorIds, cancellationToken);
        if (!saved)
        {
            return Refused(SceneStartOutcome.Conflict);
        }

        var finished = active is null ? null : await ToViewAsync(active, cancellationToken);
        return new SceneStartResult(SceneStartOutcome.Started, await ToViewAsync(scene, cancellationToken), finished, cancelled);
    }

    /// <summary>Finishes the Campaign's Active Scene, cancelling its Waiting Requested Rolls in the same save.</summary>
    public async Task<SceneFinishResult> FinishActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return new SceneFinishResult(SceneFinishOutcome.NoActiveScene, null, []);
        }

        active.Finish(_timeProvider.GetUtcNow());
        var cancelled = await CloseSceneRollsAsync(campaignId, active.Id, _ => true, cancellationToken);
        return await TrySaveAsync(cancellationToken)
            ? new SceneFinishResult(SceneFinishOutcome.Finished, await ToViewAsync(active, cancellationToken), cancelled)
            : new SceneFinishResult(SceneFinishOutcome.Conflict, null, []);
    }

    /// <summary>
    /// Replaces the Investigators present of the Active Scene under the start rules, cancelling the Waiting Requested
    /// Rolls of the Investigators no longer present in the same save.
    /// </summary>
    public async Task<InvestigatorsPresentResult> ReplaceInvestigatorsPresentAsync(
        Guid campaignId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return new InvestigatorsPresentResult(InvestigatorsPresentOutcome.NoActiveScene, null, []);
        }

        var outcome = active.ReplaceInvestigatorsPresent(presentInvestigatorIds, approvedInvestigatorIds);
        if (outcome != SceneTransitionOutcome.Transitioned)
        {
            return new InvestigatorsPresentResult(ToPresentOutcome(outcome), null, []);
        }

        var cancelled = await CloseSceneRollsAsync(campaignId, active.Id, investigatorId => !presentInvestigatorIds.Contains(investigatorId), cancellationToken);
        return await TrySaveAsync(cancellationToken)
            ? new InvestigatorsPresentResult(InvestigatorsPresentOutcome.Replaced, await ToViewAsync(active, cancellationToken), cancelled)
            : new InvestigatorsPresentResult(InvestigatorsPresentOutcome.Conflict, null, []);
    }

    // A plain start is one save; finish-then-start is one transaction with two ordered saves (ADR 0025). The finished
    // Scene's Waiting rolls close after every refusal check, so a refused start cancels nothing.
    private async Task<(bool Saved, IReadOnlyList<CancelledRequestedRoll> Cancelled)> TryWriteStartAsync(
        Guid campaignId,
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
            return (await TrySaveAsync(() => _scenes.SaveChangesAsync(cancellationToken)), []);
        }

        active.Finish(now);
        var cancelled = await CloseSceneRollsAsync(campaignId, active.Id, _ => true, cancellationToken);
        return (await TrySaveAsync(() => _scenes.SaveFinishThenStartAsync(() => scene.Start(now, presentInvestigatorIds, approvedInvestigatorIds), cancellationToken)), cancelled);
    }

    /// <summary>Closes the affected Waiting Requested Rolls of the Scene; the caller writes them with the Scene.</summary>
    private async Task<IReadOnlyList<CancelledRequestedRoll>> CloseSceneRollsAsync(
        Guid campaignId,
        Guid sceneId,
        Func<Guid, bool> isAffected,
        CancellationToken cancellationToken)
    {
        var requests = await _requests.ListTrackedForSceneAsync(campaignId, sceneId, cancellationToken);
        var cancelled = new List<CancelledRequestedRoll>();
        foreach (var request in requests)
        {
            cancelled.AddRange(request.CloseRollsForSceneExit(isAffected)
                .Select(investigatorId => new CancelledRequestedRoll(request.Id, investigatorId, request.Visibility)));
        }

        return cancelled;
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
        return ToView(scene, scenario?.Title ?? string.Empty);
    }

    private static PlayableSceneView ToView(Scene scene, string scenarioTitle) =>
        new(
            scene.Id,
            scene.ScenarioId,
            scenarioTitle,
            scene.Title,
            scene.Location,
            scene.Status,
            scene.StartedAt,
            scene.FinishedAt,
            scene.InvestigatorsPresent,
            scene.Reveals.Select(RevealViews.ToView).ToList());

    private static SceneStartResult Refused(SceneStartOutcome outcome) => new(outcome, null, null, []);

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
