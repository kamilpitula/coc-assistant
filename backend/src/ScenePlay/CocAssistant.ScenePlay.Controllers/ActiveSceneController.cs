namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// Starting, finishing, and re-staffing the Campaign's Active Scene, and reading it (specs/scene-play/spec.md, API Contracts).
/// Campaign members only: non-members and missing Campaigns get 404 on every call, and a Player gets 404 on every write.
/// </summary>
[Route("api/campaigns/{campaignId:guid}")]
public class ActiveSceneController : ScenePlayControllerBase
{
    private readonly ActiveSceneService _activeScenes;

    public ActiveSceneController(ActiveSceneService activeScenes, AccountService accountService)
        : base(accountService)
    {
        _activeScenes = activeScenes;
    }

    /// <summary>Starts a Prepared Scene of any Scenario of the Campaign with the given Investigators present.</summary>
    [HttpPost("scenes/{sceneId:guid}/start")]
    public async Task<ActionResult<KeeperActiveSceneResponse>> Start(Guid campaignId, Guid sceneId, StartSceneRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _activeScenes.StartAsync(
            campaignId, accountId.Value, sceneId, request.PresentInvestigatorIds ?? [], request.FinishActiveScene, cancellationToken);
        return result.Scene is not null ? Ok(ToResponse(result.Scene)) : StartFailure(result.Outcome);
    }

    /// <summary>Finishes the Active Scene.</summary>
    [HttpPost("active-scene/finish")]
    public async Task<IActionResult> Finish(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return await _activeScenes.FinishAsync(campaignId, accountId.Value, cancellationToken) switch
        {
            FinishSceneOutcome.Finished => NoContent(),
            FinishSceneOutcome.NotFound => NotFound(),
            _ => Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
        };
    }

    /// <summary>Replaces the Investigators present with the same validation as starting.</summary>
    [HttpPut("active-scene/present-investigators")]
    public async Task<ActionResult<KeeperActiveSceneResponse>> ChangePresent(
        Guid campaignId,
        ChangePresentInvestigatorsRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _activeScenes.ChangePresentAsync(campaignId, accountId.Value, request.PresentInvestigatorIds ?? [], cancellationToken);
        return result.Scene is not null ? Ok(ToResponse(result.Scene)) : ChangePresentFailure(result.Outcome);
    }

    /// <summary>The Active Scene as the caller may see it: 204 when none is Active.</summary>
    [HttpGet("active-scene")]
    public async Task<IActionResult> Get(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return await _activeScenes.GetAsync(campaignId, accountId.Value, cancellationToken) switch
        {
            KeeperActiveSceneRead keeper => Ok(ToResponse(keeper.Scene)),
            PresentPlayerActiveSceneRead present => Ok(ToResponse(present.Scene)),
            AbsentPlayerActiveSceneRead absent => Ok(new AbsentPlayerActiveSceneResponse(absent.Title, false)),
            NothingActive => NoContent(),
            _ => NotFound(),
        };
    }

    private ActionResult StartFailure(StartSceneOutcome outcome) =>
        outcome switch
        {
            StartSceneOutcome.NotPrepared => Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NotPreparedTitle),
            StartSceneOutcome.ActiveSceneExists or StartSceneOutcome.Conflict =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.AnotherSceneActiveTitle),
            StartSceneOutcome.NoInvestigatorPresent => Invalid(ActiveSceneProblems.EmptyPresentMessage),
            StartSceneOutcome.DuplicateInvestigator => Invalid(ActiveSceneProblems.DuplicatePresentMessage),
            StartSceneOutcome.InvestigatorNotApproved => Invalid(ActiveSceneProblems.NotApprovedPresentMessage),
            _ => NotFound(),
        };

    private ActionResult ChangePresentFailure(ChangePresentOutcome outcome) =>
        outcome switch
        {
            ChangePresentOutcome.NoActiveScene or ChangePresentOutcome.Conflict =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            ChangePresentOutcome.NoInvestigatorPresent => Invalid(ActiveSceneProblems.EmptyPresentMessage),
            ChangePresentOutcome.DuplicateInvestigator => Invalid(ActiveSceneProblems.DuplicatePresentMessage),
            ChangePresentOutcome.InvestigatorNotApproved => Invalid(ActiveSceneProblems.NotApprovedPresentMessage),
            _ => NotFound(),
        };

    private ActionResult Invalid(string message)
    {
        ModelState.AddModelError(ActiveSceneProblems.PresentKey, message);
        return ValidationProblem(ModelState);
    }

    private static KeeperActiveSceneResponse ToResponse(KeeperActiveSceneView view) =>
        new(
            view.SceneId,
            view.ScenarioId,
            view.ScenarioTitle,
            view.Title,
            view.Location,
            view.StartedAt,
            view.InvestigatorsPresent.Select(investigator => new InvestigatorPresentResponse(investigator.Id, investigator.Name)).ToList(),
            []);

    private static PresentPlayerActiveSceneResponse ToResponse(PresentPlayerActiveSceneView view) =>
        new(
            true,
            view.Title,
            view.Location,
            view.InvestigatorsPresent.Select(investigator => new PlayerInvestigatorPresentResponse(investigator.Name, investigator.IsYours)).ToList(),
            []);
}
