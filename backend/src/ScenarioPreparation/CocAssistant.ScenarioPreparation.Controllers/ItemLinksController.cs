namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scene's Item links for its Campaign's Keeper (specs/scenario-preparation/spec.md). Everyone else, and every id from another
/// Scenario or Campaign, gets the same 404 (ADR 0013, ADR 0016). There is no GET: the Scene response carries the links.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/scenarios/{scenarioId:guid}/scenes/{sceneId:guid}/item-links")]
public class ItemLinksController : ScenarioPreparationControllerBase
{
    private readonly ItemLinkService _linkService;

    public ItemLinksController(ItemLinkService linkService, AccountService accountService)
        : base(accountService)
    {
        _linkService = linkService;
    }

    /// <summary>
    /// Links an Item of the Campaign to the Scene: 201 with the new link, or 200 with the existing one when the Item is already
    /// linked. 409 when the Scene is Finished; 400 keyed <c>itemId</c> for an Item that is not in the Campaign.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ItemLinkResponse>> Link(Guid campaignId, Guid scenarioId, Guid sceneId, ItemLinkRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _linkService.LinkAsync(campaignId, accountId.Value, scenarioId, sceneId, request.ItemId, cancellationToken);
        return result.Outcome switch
        {
            ItemLinkWriteOutcome.Linked => StatusCode(StatusCodes.Status201Created, ToResponse(result.Link!)),
            ItemLinkWriteOutcome.AlreadyLinked => Ok(ToResponse(result.Link!)),
            ItemLinkWriteOutcome.ItemNotInCampaign => Invalid(ItemProblemMessages.ItemIdKey, ItemProblemMessages.ItemNotInCampaign),
            ItemLinkWriteOutcome.Finished => Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => NotFound(),
        };
    }

    /// <summary>Removes the link; the Item is untouched. 409 when the Scene is Finished.</summary>
    [HttpDelete("{linkId:guid}")]
    public async Task<IActionResult> Unlink(Guid campaignId, Guid scenarioId, Guid sceneId, Guid linkId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _linkService.UnlinkAsync(campaignId, accountId.Value, scenarioId, sceneId, linkId, cancellationToken);
        return outcome switch
        {
            ItemUnlinkOutcome.Unlinked => NoContent(),
            ItemUnlinkOutcome.Finished => Problem(statusCode: StatusCodes.Status409Conflict, title: SceneProblemTitles.Finished),
            _ => NotFound(),
        };
    }

    internal static ItemLinkResponse ToResponse(ItemLinkView view) => new(view.Id, new ItemReferenceResponse(view.Item.Id, view.Item.Name));

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
