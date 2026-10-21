namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scenario's Scenes for its Campaign's Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from
/// another Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes")]
public class ScenesController : ScenarioPreparationControllerBase
{
    private readonly SceneService _sceneService;

    public ScenesController(SceneService sceneService, AccountService accountService)
        : base(accountService)
    {
        _sceneService = sceneService;
    }

    /// <summary>The Scenario's Scenes in prepared order.</summary>
    [HttpGet]
    public async Task<ActionResult<SceneListResponse>> List(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var scenes = await _sceneService.ListAsync(campaignId, accountId.Value, scenarioId, cancellationToken);
        return scenes is null ? NotFound() : Ok(ToListResponse(scenes));
    }

    /// <summary>Appends a Prepared Scene after the existing ones.</summary>
    [HttpPost]
    public async Task<ActionResult<SceneResponse>> Create(Guid campaignId, Guid scenarioId, SceneRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _sceneService.CreateAsync(
            campaignId,
            accountId.Value,
            scenarioId,
            request.Title ?? string.Empty,
            request.Location,
            request.KeeperNotes?.GetRawText(),
            cancellationToken);
        return result.Outcome == SceneWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, ToResponse(result.Scene!))
            : Failure(result.Outcome);
    }

    /// <summary>One Scene.</summary>
    [HttpGet("{sceneId:guid}")]
    public async Task<ActionResult<SceneResponse>> Get(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var scene = await _sceneService.GetAsync(campaignId, accountId.Value, scenarioId, sceneId, cancellationToken);
        return scene is null ? NotFound() : Ok(ToResponse(scene));
    }

    /// <summary>Replaces a Scene's title, location, and Keeper notes; its place in the order is unchanged. 409 when Finished.</summary>
    [HttpPut("{sceneId:guid}")]
    public async Task<ActionResult<SceneResponse>> Edit(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        SceneRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _sceneService.EditAsync(
            campaignId,
            accountId.Value,
            scenarioId,
            sceneId,
            request.Title ?? string.Empty,
            request.Location,
            request.KeeperNotes?.GetRawText(),
            cancellationToken);
        return result.Outcome == SceneWriteOutcome.Saved ? Ok(ToResponse(result.Scene!)) : Failure(result.Outcome);
    }

    /// <summary>Removes a Prepared Scene; 409 when it is Active or Finished.</summary>
    [HttpDelete("{sceneId:guid}")]
    public async Task<IActionResult> Remove(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _sceneService.RemoveAsync(campaignId, accountId.Value, scenarioId, sceneId, cancellationToken);
        return outcome switch
        {
            SceneRemoveOutcome.Removed => NoContent(),
            SceneRemoveOutcome.NotPrepared => Problem(statusCode: StatusCodes.Status409Conflict, title: "Only a Prepared Scene can be removed."),
            _ => NotFound(),
        };
    }

    /// <summary>Replaces the order with the full list of the Scenario's Scene ids; a stale or foreign list is a 409.</summary>
    [HttpPut("order")]
    public async Task<ActionResult<SceneListResponse>> Reorder(
        Guid campaignId,
        Guid scenarioId,
        SceneOrderRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _sceneService.ReorderAsync(campaignId, accountId.Value, scenarioId, request.SceneIds, cancellationToken);
        return result.Outcome switch
        {
            SceneReorderOutcome.Reordered => Ok(ToListResponse(result.Scenes!)),
            SceneReorderOutcome.DuplicateIds => Invalid("sceneIds", "The Scene ids must not repeat."),
            SceneReorderOutcome.DoesNotMatchScenes => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "The order does not match the Scenario's current Scenes."),
            _ => NotFound(),
        };
    }

    private ActionResult Failure(SceneWriteOutcome outcome) =>
        outcome switch
        {
            SceneWriteOutcome.InvalidTitle => Invalid("title", $"The title must be between 1 and {Scene.TitleMaxLength} characters."),
            SceneWriteOutcome.InvalidLocation => Invalid("location", $"The location must be at most {Scene.LocationMaxLength} characters."),
            SceneWriteOutcome.InvalidKeeperNotes => Invalid(
                "keeperNotes",
                $"The Keeper notes must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes."),
            SceneWriteOutcome.Finished => Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => NotFound(),
        };

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }

    private static SceneSummaryResponse ToSummaryResponse(SceneSummaryView view) =>
        new(view.Id, view.Title, view.Status.ToString(), view.StartedAt, view.FinishedAt);

    private static SceneListResponse ToListResponse(IReadOnlyList<SceneSummaryView> views) => new(views.Select(ToSummaryResponse).ToList());

    private static SceneResponse ToResponse(SceneDetailView view) =>
        new(
            view.Id,
            view.Title,
            view.Location,
            RichTextJson.Parse(view.KeeperNotes),
            view.Status.ToString(),
            view.StartedAt,
            view.FinishedAt,
            view.NonPlayerEntityLinks.Select(NonPlayerEntityLinksController.ToResponse).ToList());
}
