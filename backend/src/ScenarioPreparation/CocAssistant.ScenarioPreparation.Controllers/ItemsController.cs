namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Campaign's Items for its Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from another Campaign, gets
/// the same 404 (ADR 0013). A refused write is a 400 keyed by request path (ADR 0018).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/items")]
public class ItemsController : ScenarioPreparationControllerBase
{
    private readonly ItemService _itemService;

    public ItemsController(ItemService itemService, AccountService accountService)
        : base(accountService)
    {
        _itemService = itemService;
    }

    /// <summary>Each Item of the Campaign as <c>{id, name, sceneCount}</c>, ordered by name.</summary>
    [HttpGet]
    public async Task<ActionResult<ItemListResponse>> List(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var items = await _itemService.ListAsync(campaignId, accountId.Value, cancellationToken);
        return items is null
            ? NotFound()
            : Ok(new ItemListResponse(items.Select(item => new ItemSummaryResponse(item.Id, item.Name, item.SceneCount)).ToList()));
    }

    /// <summary>Creates an Item.</summary>
    [HttpPost]
    public async Task<ActionResult<ItemResponse>> Create(Guid campaignId, ItemRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _itemService.CreateAsync(
            campaignId,
            accountId.Value,
            request.Name ?? string.Empty,
            request.PlayerFacingDescription?.GetRawText(),
            request.KeeperNotes?.GetRawText(),
            cancellationToken);
        return result.Outcome == ItemWriteOutcome.Saved
            ? StatusCode(StatusCodes.Status201Created, ToResponse(result.Item!))
            : Failure(result.Outcome, request.Name);
    }

    /// <summary>One Item with its descriptions, holder, Handouts, and Scenes.</summary>
    [HttpGet("{itemId:guid}")]
    public async Task<ActionResult<ItemResponse>> Get(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _itemService.GetAsync(campaignId, accountId.Value, itemId, cancellationToken);
        return view is null ? NotFound() : Ok(ToResponse(view));
    }

    /// <summary>Replaces the name, Player-facing description, and Keeper notes.</summary>
    [HttpPut("{itemId:guid}")]
    public async Task<ActionResult<ItemResponse>> Edit(Guid campaignId, Guid itemId, ItemRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _itemService.EditAsync(
            campaignId,
            accountId.Value,
            itemId,
            request.Name ?? string.Empty,
            request.PlayerFacingDescription?.GetRawText(),
            request.KeeperNotes?.GetRawText(),
            cancellationToken);
        return result.Outcome == ItemWriteOutcome.Saved ? Ok(ToResponse(result.Item!)) : Failure(result.Outcome, request.Name);
    }

    /// <summary>Deletes an Item with its Prepared links and Handouts. 409 while the Item is linked to an Active or Finished Scene or held.</summary>
    [HttpDelete("{itemId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _itemService.DeleteAsync(campaignId, accountId.Value, itemId, cancellationToken);
        return outcome switch
        {
            ItemDeleteOutcome.Deleted => NoContent(),
            ItemDeleteOutcome.LinkedToPlayedScene => Problem(statusCode: StatusCodes.Status409Conflict, title: ItemProblemMessages.LinkedToPlayedSceneTitle),
            ItemDeleteOutcome.Held => Problem(statusCode: StatusCodes.Status409Conflict, title: ItemProblemMessages.HeldTitle),
            _ => NotFound(),
        };
    }

    private static ItemResponse ToResponse(ItemView view) =>
        new(
            view.Id,
            view.Name,
            RichTextJson.Parse(view.PlayerFacingDescription),
            RichTextJson.Parse(view.KeeperNotes),
            view.Holder is { } holder ? new ItemHolderResponse(holder.InvestigatorId) : null,
            view.Handouts.Select(HandoutsController.ToSummaryResponse).ToList(),
            view.Scenes.Select(scene => new ItemSceneResponse(scene.ScenarioId, scene.ScenarioTitle, scene.SceneId, scene.SceneTitle, scene.Status.ToString())).ToList());

    private ActionResult Failure(ItemWriteOutcome outcome, string? submittedName) =>
        outcome switch
        {
            ItemWriteOutcome.InvalidName => Invalid(ItemProblemMessages.NameKey, ItemProblemMessages.Name(submittedName)),
            ItemWriteOutcome.MissingDescription => Invalid(ItemProblemMessages.PlayerFacingDescriptionKey, ItemProblemMessages.MissingDescription),
            ItemWriteOutcome.InvalidDescription => Invalid(ItemProblemMessages.PlayerFacingDescriptionKey, ItemProblemMessages.InvalidDescription),
            ItemWriteOutcome.InvalidKeeperNotes => Invalid(ItemProblemMessages.KeeperNotesKey, ItemProblemMessages.InvalidKeeperNotes),
            _ => NotFound(),
        };

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
