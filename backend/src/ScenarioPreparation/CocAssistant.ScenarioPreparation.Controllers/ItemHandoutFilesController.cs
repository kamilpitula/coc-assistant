namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The Image, Document, and Map Handouts of an Item for its Campaign's Keeper: multipart add and edit on the same routes as the
/// JSON Handout actions, and the file download, with the same 400, 413, and 503 answers as a Scene's (PBI-SP-008 D3). Only the
/// multipart actions carry [Consumes], for the reason given on <see cref="HandoutFilesController"/>.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/items/{itemId:guid}/handouts")]
public class ItemHandoutFilesController : ScenarioPreparationControllerBase
{
    // 20 MiB of file plus 1 MiB for the multipart framing; applies to these actions only (PBI-SP-007 single-option decisions).
    private const long RequestLimitBytes = 22_020_096;

    private readonly HandoutFileService _handoutFileService;

    public ItemHandoutFilesController(HandoutFileService handoutFileService, AccountService accountService)
        : base(accountService)
    {
        _handoutFileService = handoutFileService;
    }

    /// <summary>Adds an Image, Document, or Map Handout from a multipart form.</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [DisableFormValueProvider]
    [RequestSizeLimit(RequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestLimitBytes)]
    public async Task<ActionResult<HandoutResponse>> Create(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
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
            new ItemHandoutOwnerReference(itemId),
            kind,
            HandoutsController.ParseVisibility(form["visibility"]),
            form["title"].ToString(),
            upload.Upload,
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, HandoutsController.ToResponse(result.Handout!))
            : this.FileWriteFailure(result.Outcome, form["title"], kind);
    }

    /// <summary>Replaces the Handout's kind, visibility, title, and, when a file is sent, its file.</summary>
    [HttpPut("{handoutId:guid}")]
    [Consumes("multipart/form-data")]
    [DisableFormValueProvider]
    [RequestSizeLimit(RequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestLimitBytes)]
    public async Task<ActionResult<HandoutResponse>> Edit(Guid campaignId, Guid itemId, Guid handoutId, CancellationToken cancellationToken)
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
            new ItemHandoutOwnerReference(itemId),
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
    public async Task<IActionResult> Download(Guid campaignId, Guid itemId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.DownloadResult(await _handoutFileService.OpenAsync(campaignId, accountId.Value, new ItemHandoutOwnerReference(itemId), handoutId, cancellationToken));
    }
}
