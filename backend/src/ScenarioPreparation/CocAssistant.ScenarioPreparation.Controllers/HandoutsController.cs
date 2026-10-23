namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scene's Handouts for its Campaign's Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from another
/// Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016). The Scene response lists summaries; this controller serves the
/// content of one Handout.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/handouts")]
public class HandoutsController : ScenarioPreparationControllerBase
{
    private readonly HandoutService _handoutService;

    public HandoutsController(HandoutService handoutService, AccountService accountService)
        : base(accountService)
    {
        _handoutService = handoutService;
    }

    /// <summary>One Handout with its content.</summary>
    [HttpGet("{handoutId:guid}")]
    public async Task<ActionResult<HandoutResponse>> Get(Guid campaignId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var handout = await _handoutService.GetAsync(campaignId, accountId.Value, new SceneHandoutOwnerReference(scenarioId, sceneId), handoutId, cancellationToken);
        return handout is null ? NotFound() : Ok(ToResponse(handout));
    }

    /// <summary>Adds a Handout after the Scene's others. 409 when the Scene is Finished.</summary>
    [HttpPost]
    public async Task<ActionResult<HandoutResponse>> Create(Guid campaignId, Guid scenarioId, Guid sceneId, HandoutRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _handoutService.CreateAsync(
            campaignId,
            accountId.Value,
            new SceneHandoutOwnerReference(scenarioId, sceneId),
            ParseKind(request.Kind),
            ParseVisibility(request.Visibility),
            request.Title ?? string.Empty,
            request.Content?.GetRawText(),
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, ToResponse(result.Handout!))
            : this.JsonWriteFailure(result.Outcome, request.Title);
    }

    /// <summary>Replaces the Handout's kind, visibility, title, and content. 409 when the Scene is Finished.</summary>
    [HttpPut("{handoutId:guid}")]
    public async Task<ActionResult<HandoutResponse>> Edit(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        Guid handoutId,
        HandoutRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _handoutService.EditAsync(
            campaignId,
            accountId.Value,
            new SceneHandoutOwnerReference(scenarioId, sceneId),
            handoutId,
            ParseKind(request.Kind),
            ParseVisibility(request.Visibility),
            request.Title ?? string.Empty,
            request.Content?.GetRawText(),
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? Ok(ToResponse(result.Handout!))
            : this.JsonWriteFailure(result.Outcome, request.Title);
    }

    /// <summary>Deletes the Handout. 409 unless the Scene is Prepared.</summary>
    [HttpDelete("{handoutId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.RemoveResult(await _handoutService.RemoveAsync(campaignId, accountId.Value, new SceneHandoutOwnerReference(scenarioId, sceneId), handoutId, cancellationToken));
    }

    /// <summary>Replaces the order with the full list of the Scene's Handout ids; a stale or foreign list is a 409.</summary>
    [HttpPut("order")]
    public async Task<ActionResult<HandoutListResponse>> Reorder(Guid campaignId, Guid scenarioId, Guid sceneId, HandoutOrderRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.ReorderResult(await _handoutService.ReorderAsync(campaignId, accountId.Value, new SceneHandoutOwnerReference(scenarioId, sceneId), request.HandoutIds, cancellationToken));
    }

    internal static HandoutSummaryResponse ToSummaryResponse(HandoutSummaryView view) =>
        new(view.Id, view.Kind.ToString(), view.Visibility.ToString(), view.Title);

    internal static HandoutResponse ToResponse(HandoutView view) =>
        new(
            view.Id,
            view.Kind.ToString(),
            view.Visibility.ToString(),
            view.Title,
            RichTextJson.Parse(view.Content),
            view.File is { } file ? new HandoutFileResponse(file.Name, file.MediaType, file.SizeBytes) : null);

    // Only the exact wire names are accepted, case-sensitively, so numbers and odd casings are not kinds.
    internal static HandoutKind? ParseKind(string? kind) => kind switch
    {
        nameof(HandoutKind.ReadAloud) => HandoutKind.ReadAloud,
        nameof(HandoutKind.Text) => HandoutKind.Text,
        nameof(HandoutKind.Image) => HandoutKind.Image,
        nameof(HandoutKind.Document) => HandoutKind.Document,
        nameof(HandoutKind.Map) => HandoutKind.Map,
        _ => null,
    };

    internal static HandoutVisibility? ParseVisibility(string? visibility) => visibility switch
    {
        nameof(HandoutVisibility.PlayerFacing) => HandoutVisibility.PlayerFacing,
        nameof(HandoutVisibility.KeeperFacing) => HandoutVisibility.KeeperFacing,
        _ => null,
    };
}
