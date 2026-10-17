namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Campaign's Non-Player Entity list for its Keeper (specs/scenario-preparation/spec.md). Everyone else gets the same
/// 404 (ADR 0013).
/// </summary>
[Route("api/campaigns/{campaignId:guid}/non-player-entities")]
public class NonPlayerEntitiesController : ScenarioPreparationControllerBase
{
    private readonly NonPlayerEntityService _nonPlayerEntityService;

    public NonPlayerEntitiesController(NonPlayerEntityService nonPlayerEntityService, AccountService accountService)
        : base(accountService)
    {
        _nonPlayerEntityService = nonPlayerEntityService;
    }

    /// <summary>Each Human NPC and Mythos Creature of the Campaign as <c>{id, type, name}</c>, ordered by name.</summary>
    [HttpGet]
    public async Task<ActionResult<NonPlayerEntityListResponse>> List(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var items = await _nonPlayerEntityService.ListAsync(campaignId, accountId.Value, cancellationToken);
        return items is null ? NotFound() : Ok(HumanNpcMapping.ToResponse(items));
    }
}
