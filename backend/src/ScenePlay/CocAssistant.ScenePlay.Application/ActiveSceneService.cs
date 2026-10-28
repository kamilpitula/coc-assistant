namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Starts, finishes, and re-staffs the Campaign's Active Scene for its Keeper, and reads it for any member (specs/scene-play/spec.md).
/// The Keeper check runs first on every write, so a Player or non-member gets NotFound before any Scene, Investigator, Wall, or
/// live port is touched. After a transition commits, the Public Wall Entries and the activeScene signal follow; a failure of either
/// is logged and never fails or undoes the transition (ADR 0024).
/// </summary>
public class ActiveSceneService
{
    private readonly ICampaignRoles _roles;
    private readonly IPlayableScenes _scenes;
    private readonly IApprovedInvestigators _approved;
    private readonly ISceneWallEntries _wall;
    private readonly IActiveSceneSignals _signals;
    private readonly ILogger<ActiveSceneService> _logger;

    public ActiveSceneService(
        ICampaignRoles roles,
        IPlayableScenes scenes,
        IApprovedInvestigators approved,
        ISceneWallEntries wall,
        IActiveSceneSignals signals,
        ILogger<ActiveSceneService> logger)
    {
        _roles = roles;
        _scenes = scenes;
        _approved = approved;
        _wall = wall;
        _signals = signals;
        _logger = logger;
    }

    /// <summary>Starts a Prepared Scene of any Scenario of the Campaign, finishing the Active Scene in the same transaction when asked.</summary>
    public async Task<StartSceneViewResult> StartAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid sceneId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        bool finishActiveScene,
        CancellationToken cancellationToken)
    {
        if (!await IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new StartSceneViewResult(StartSceneOutcome.SceneNotFound, null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var result = await _scenes.StartAsync(
            campaignId, sceneId, presentInvestigatorIds, approved.Select(investigator => investigator.InvestigatorId).ToList(), finishActiveScene, cancellationToken);
        if (result.Outcome != StartSceneOutcome.Started)
        {
            return new StartSceneViewResult(result.Outcome, null);
        }

        // The finished entry comes first. Equal timestamps tie-break by id, so callers must not rely on the order.
        if (result.Finished is not null)
        {
            await TryAddWallEntryAsync(campaignId, callerAccountId, $"Scene finished: {result.Finished.Title}", cancellationToken);
        }

        await TryAddWallEntryAsync(campaignId, callerAccountId, $"Scene started: {result.Started!.Title}", cancellationToken);
        await TrySignalAsync(campaignId, cancellationToken);
        return new StartSceneViewResult(StartSceneOutcome.Started, ActiveSceneProjection.ForKeeper(result.Started, approved));
    }

    /// <summary>Finishes the Active Scene.</summary>
    public async Task<FinishSceneOutcome> FinishAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (!await IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return FinishSceneOutcome.NotFound;
        }

        var result = await _scenes.FinishActiveAsync(campaignId, cancellationToken);
        if (result.Outcome != FinishSceneOutcome.Finished)
        {
            return result.Outcome;
        }

        await TryAddWallEntryAsync(campaignId, callerAccountId, $"Scene finished: {result.Finished!.Title}", cancellationToken);
        await TrySignalAsync(campaignId, cancellationToken);
        return FinishSceneOutcome.Finished;
    }

    /// <summary>Replaces the Investigators present in the Active Scene. No Wall Entry is made.</summary>
    public async Task<ChangePresentViewResult> ChangePresentAsync(
        Guid campaignId,
        Guid callerAccountId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        CancellationToken cancellationToken)
    {
        if (!await IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new ChangePresentViewResult(ChangePresentOutcome.NotFound, null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var result = await _scenes.ReplaceInvestigatorsPresentAsync(
            campaignId, presentInvestigatorIds, approved.Select(investigator => investigator.InvestigatorId).ToList(), cancellationToken);
        if (result.Outcome != ChangePresentOutcome.Replaced)
        {
            return new ChangePresentViewResult(result.Outcome, null);
        }

        await TrySignalAsync(campaignId, cancellationToken);
        return new ChangePresentViewResult(ChangePresentOutcome.Replaced, ActiveSceneProjection.ForKeeper(result.Scene!, approved));
    }

    /// <summary>The Active Scene as the caller may see it.</summary>
    public async Task<ActiveSceneRead> GetAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        var role = await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken);
        if (role is null)
        {
            return new NotAMemberRead();
        }

        var scene = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (scene is null)
        {
            return new NothingActive();
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        return role == CampaignMemberRole.Keeper
            ? new KeeperActiveSceneRead(ActiveSceneProjection.ForKeeper(scene, approved))
            : ActiveSceneProjection.ForPlayer(scene, approved, callerAccountId);
    }

    private async Task<bool> IsKeeperAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken) =>
        await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) == CampaignMemberRole.Keeper;

    private async Task TryAddWallEntryAsync(Guid campaignId, Guid keeperAccountId, string text, CancellationToken cancellationToken)
    {
        try
        {
            await _wall.AddPublicAsync(campaignId, keeperAccountId, text, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The Wall Entry for a Scene transition in Campaign {CampaignId} could not be created.", campaignId);
        }
    }

    private async Task TrySignalAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        try
        {
            await _signals.ActiveSceneChangedAsync(campaignId, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The activeScene signal for Campaign {CampaignId} could not be published.", campaignId);
        }
    }
}
