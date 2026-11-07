namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// An Item's holder and held Items (specs/scene-play/spec.md, API Contracts; PBI-SPL-003 D5). The Keeper gives and takes back;
/// a Player reads only their own held Items, without Item ids. Everyone else gets 404.
/// </summary>
[Route("api/campaigns/{campaignId:guid}")]
public class ItemHolderController : ScenePlayControllerBase
{
    private readonly ItemHolderService _holders;

    public ItemHolderController(ItemHolderService holders, AccountService accountService)
        : base(accountService)
    {
        _holders = holders;
    }

    /// <summary>Gives the Item to an Investigator present in the Active Scene; returns the created give Reveal as the Keeper sees it.</summary>
    [HttpPost("items/{itemId:guid}/give")]
    public async Task<ActionResult<KeeperRevealResponse>> Give(Guid campaignId, Guid itemId, GiveItemRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _holders.GiveAsync(campaignId, accountId.Value, itemId, request.InvestigatorId, cancellationToken);
        return result.Reveal is not null ? Ok(RevealMapping.ToResponse(result.Reveal)) : Failure(result.Outcome);
    }

    /// <summary>Takes the Item back. 204 whether or not anyone held it; 404 when the Item is not in the Campaign.</summary>
    [HttpPost("items/{itemId:guid}/take-back")]
    public async Task<IActionResult> TakeBack(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = (await _holders.TakeBackAsync(campaignId, accountId.Value, itemId, cancellationToken)).Outcome;
        return outcome switch
        {
            TakeBackItemOutcome.TakenBack => NoContent(),
            TakeBackItemOutcome.NotHeld => NoContent(),
            TakeBackItemOutcome.ItemNotFound => NotFound(),
            TakeBackItemOutcome.Conflict => Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };
    }

    /// <summary>The calling Player's held Items, newest first. 404 for the Keeper and for a Player without an Approved Investigator.</summary>
    [HttpGet("investigators/mine/items")]
    public async Task<ActionResult<HeldItemsResponse>> GetMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _holders.ListMyItemsAsync(campaignId, accountId.Value, cancellationToken);
        return result is null ? NotFound() : Ok(RevealMapping.ToMineResponse(result));
    }

    /// <summary>The Approved Investigator's held Items, newest first, for the Keeper. 404 for anyone else.</summary>
    [HttpGet("investigators/{investigatorId:guid}/items")]
    public async Task<ActionResult<KeeperHeldItemsResponse>> GetForInvestigator(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _holders.ListInvestigatorItemsAsync(campaignId, accountId.Value, investigatorId, cancellationToken);
        return result is null ? NotFound() : Ok(RevealMapping.ToInvestigatorResponse(result));
    }

    private ActionResult Failure(GiveItemOutcome outcome) =>
        outcome switch
        {
            GiveItemOutcome.NoActiveScene => Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            GiveItemOutcome.ItemNotFound => NotFound(),
            GiveItemOutcome.NotLinked => Invalid(ItemHolderProblems.ItemIdKey, ItemHolderProblems.ItemNotLinkedMessage),
            GiveItemOutcome.RecipientNotPresent => Invalid(ItemHolderProblems.InvestigatorIdKey, ItemHolderProblems.InvestigatorNotPresentMessage),
            GiveItemOutcome.AlreadyHolder => Invalid(ItemHolderProblems.InvestigatorIdKey, ItemHolderProblems.AlreadyHolderMessage),
            GiveItemOutcome.Conflict => Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };

    private ActionResult Invalid(string key, string message)
    {
        ModelState.AddModelError(key, message);
        return ValidationProblem(ModelState);
    }
}
