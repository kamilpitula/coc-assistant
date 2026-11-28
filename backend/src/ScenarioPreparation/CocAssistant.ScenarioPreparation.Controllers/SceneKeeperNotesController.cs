namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scene's Keeper notes for its Campaign's Keeper (specs/scenario-preparation/spec.md). The save is accepted in every
/// Scene status, Finished included, and never changes the Scene version (ADR 0037). Everyone else, and every id from
/// another Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/keeper-notes")]
public class SceneKeeperNotesController : ScenarioPreparationControllerBase
{
    private readonly SceneKeeperNotesService _notesService;

    public SceneKeeperNotesController(SceneKeeperNotesService notesService, AccountService accountService)
        : base(accountService)
    {
        _notesService = notesService;
    }

    /// <summary>
    /// Replaces the Keeper notes when <c>notesVersion</c> is the current one. A stale save changes nothing and answers
    /// 409 with the current notes and version; each save publishes the scenes topic.
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<SceneKeeperNotesResponse>> Save(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        SceneKeeperNotesRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _notesService.SaveAsync(
            campaignId,
            accountId.Value,
            scenarioId,
            sceneId,
            request.KeeperNotes?.GetRawText(),
            request.NotesVersion,
            cancellationToken);
        return result.Outcome switch
        {
            SceneKeeperNotesWriteOutcome.Saved => Ok(ToResponse(result.Notes!)),
            SceneKeeperNotesWriteOutcome.StaleNotesVersion => KeeperNotesConflict(result.Notes!),
            SceneKeeperNotesWriteOutcome.MissingNotesVersion => Invalid("notesVersion", "The notes version is required."),
            SceneKeeperNotesWriteOutcome.InvalidKeeperNotes => Invalid(
                "keeperNotes",
                $"The Keeper notes must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes."),
            _ => NotFound(),
        };
    }

    private static SceneKeeperNotesResponse ToResponse(SceneKeeperNotesView view) =>
        new(RichTextJson.Parse(view.KeeperNotes), view.NotesVersion);

    private ObjectResult KeeperNotesConflict(SceneKeeperNotesView notes)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(
            HttpContext,
            StatusCodes.Status409Conflict,
            "The Keeper notes have changed since they were read.");
        problem.Extensions["keeperNotes"] = RichTextJson.Parse(notes.KeeperNotes);
        problem.Extensions["notesVersion"] = notes.NotesVersion;
        return new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status409Conflict,
            ContentTypes = { "application/problem+json" },
        };
    }

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
