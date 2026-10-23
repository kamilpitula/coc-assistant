namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// An Item's Handouts for its Campaign's Keeper (specs/scenario-preparation/spec.md): the same operations and answers as a Scene's
/// Handouts, through the same service (PBI-SP-008 D3). There is no Finished refusal; a delete is a 409 while the Item is in play.
/// Everyone else, and every id from another Campaign, gets the same 404 (ADR 0013).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/items/{itemId:guid}/handouts")]
public class ItemHandoutsController : ScenarioPreparationControllerBase
{
    private readonly HandoutService _handoutService;

    public ItemHandoutsController(HandoutService handoutService, AccountService accountService)
        : base(accountService)
    {
        _handoutService = handoutService;
    }

    /// <summary>One Handout with its content.</summary>
    [HttpGet("{handoutId:guid}")]
    public async Task<ActionResult<HandoutResponse>> Get(Guid campaignId, Guid itemId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var handout = await _handoutService.GetAsync(campaignId, accountId.Value, new ItemHandoutOwnerReference(itemId), handoutId, cancellationToken);
        return handout is null ? NotFound() : Ok(HandoutsController.ToResponse(handout));
    }

    /// <summary>Adds a Handout after the Item's others.</summary>
    [HttpPost]
    public async Task<ActionResult<HandoutResponse>> Create(Guid campaignId, Guid itemId, HandoutRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _handoutService.CreateAsync(
            campaignId,
            accountId.Value,
            new ItemHandoutOwnerReference(itemId),
            HandoutsController.ParseKind(request.Kind),
            HandoutsController.ParseVisibility(request.Visibility),
            request.Title ?? string.Empty,
            request.Content?.GetRawText(),
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, HandoutsController.ToResponse(result.Handout!))
            : this.JsonWriteFailure(result.Outcome, request.Title);
    }

    /// <summary>Replaces the Handout's kind, visibility, title, and content.</summary>
    [HttpPut("{handoutId:guid}")]
    public async Task<ActionResult<HandoutResponse>> Edit(Guid campaignId, Guid itemId, Guid handoutId, HandoutRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _handoutService.EditAsync(
            campaignId,
            accountId.Value,
            new ItemHandoutOwnerReference(itemId),
            handoutId,
            HandoutsController.ParseKind(request.Kind),
            HandoutsController.ParseVisibility(request.Visibility),
            request.Title ?? string.Empty,
            request.Content?.GetRawText(),
            cancellationToken);
        return result.Outcome == HandoutWriteOutcome.Saved
            ? Ok(HandoutsController.ToResponse(result.Handout!))
            : this.JsonWriteFailure(result.Outcome, request.Title);
    }

    /// <summary>Deletes the Handout. 409 while the Item is linked to an Active or Finished Scene or held.</summary>
    [HttpDelete("{handoutId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid itemId, Guid handoutId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.RemoveResult(await _handoutService.RemoveAsync(campaignId, accountId.Value, new ItemHandoutOwnerReference(itemId), handoutId, cancellationToken));
    }

    /// <summary>Replaces the order with the full list of the Item's Handout ids; a stale or foreign list is a 409.</summary>
    [HttpPut("order")]
    public async Task<ActionResult<HandoutListResponse>> Reorder(Guid campaignId, Guid itemId, HandoutOrderRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        return this.ReorderResult(await _handoutService.ReorderAsync(campaignId, accountId.Value, new ItemHandoutOwnerReference(itemId), request.HandoutIds, cancellationToken));
    }
}
