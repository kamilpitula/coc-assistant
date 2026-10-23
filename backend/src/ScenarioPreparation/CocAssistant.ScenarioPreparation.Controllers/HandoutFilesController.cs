namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The Image, Document, and Map Handouts of a Scene for its Campaign's Keeper (specs/scenario-preparation/spec.md, Handout API and
/// File storage): multipart add and edit on the same routes as the JSON Handout actions, and the file download. Everyone else, and
/// every id from another Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016). Files are served only through this API after
/// the Keeper check, with the stored media type, as attachments (PBI-SP-007 D3, D4). Only these multipart actions carry [Consumes]: the
/// unannotated JSON actions on the same routes win every other request, including one with no Content-Type, which would otherwise
/// match several [Consumes] endpoints and fail as an AmbiguousMatchException (500) before authentication.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/handouts")]
public class HandoutFilesController : ScenarioPreparationControllerBase
{
    // 20 MiB of file plus 1 MiB for the multipart framing; applies to these actions only (PBI-SP-007 single-option decisions).
    private const long RequestLimitBytes = 22_020_096;

    private readonly HandoutFileService _handoutFileService;

    public HandoutFilesController(HandoutFileService handoutFileService, AccountService accountService)
        : base(accountService)
    {
        _handoutFileService = handoutFileService;
    }

    /// <summary>Adds an Image, Document, or Map Handout from a multipart form. 409 when the Scene is Finished.</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [DisableFormValueProvider]
    [RequestSizeLimit(RequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestLimitBytes)]
    public async Task<ActionResult<HandoutResponse>> Create(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var form = await this.ReadHandoutFormAsync(cancellationToken);
        if (form is null)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge);
        }

        var kind = HandoutsController.ParseKind(form["kind"]);
        await using var upload = HandoutActionResults.OpenUpload(form);
        var result = await _handoutFileService.CreateAsync(
            campaignId,
            accountId.Value,
            new SceneHandoutOwnerReference(scenarioId, sceneId),
            kind,
            HandoutsController.ParseVisibility(form["visibility"]),
            form["title"].ToString(),
            upload.Upload,
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, HandoutsController.ToResponse(result.Handout!))
            : this.FileWriteFailure(result.Outcome, form["title"], kind);
    }

    /// <summary>Replaces the Handout's kind, visibility, title, and, when a file is sent, its file. 409 when the Scene is Finished.</summary>
    [HttpPut("{handoutId:guid}")]
    [Consumes("multipart/form-data")]
    [DisableFormValueProvider]
    [RequestSizeLimit(RequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestLimitBytes)]
    public async Task<ActionResult<HandoutResponse>> Edit(Guid campaignId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var form = await this.ReadHandoutFormAsync(cancellationToken);
        if (form is null)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge);
        }

        var kind = HandoutsController.ParseKind(form["kind"]);
        await using var upload = HandoutActionResults.OpenUpload(form);
        var result = await _handoutFileService.EditAsync(
            campaignId,
            accountId.Value,
            new SceneHandoutOwnerReference(scenarioId, sceneId),
            handoutId,
            kind,
            HandoutsController.ParseVisibility(form["visibility"]),
            form["title"].ToString(),
            upload.Upload,
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? Ok(HandoutsController.ToResponse(result.Handout!))
            : this.FileWriteFailure(result.Outcome, form["title"], kind);
    }

    /// <summary>The Handout's file as an attachment with its stored media type; 404 for a rich-text Handout; 503 when storage fails.</summary>
    [HttpGet("{handoutId:guid}/file")]
    public async Task<IActionResult> Download(Guid campaignId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.DownloadResult(await _handoutFileService.OpenAsync(campaignId, accountId.Value, new SceneHandoutOwnerReference(scenarioId, sceneId), handoutId, cancellationToken));
    }
}
