namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// An Investigator's Clues: the Reveals that reached it across the Campaign's Scenes (specs/scene-play/spec.md, API Contracts;
/// PBI-SPL-002 D5). A Player reads only their own; the Keeper reads any Approved Investigator's. Everyone else gets 404.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/investigators")]
public class CluesController : ScenePlayControllerBase
{
    private readonly RevealService _reveals;

    public CluesController(RevealService reveals, AccountService accountService)
        : base(accountService)
    {
        _reveals = reveals;
    }

    /// <summary>The calling Player's Clues, newest first. 404 for the Keeper and for a Player without an Approved Investigator.</summary>
    [HttpGet("mine/clues")]
    public async Task<ActionResult<CluesResponse>> GetMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _reveals.ListMyCluesAsync(campaignId, accountId.Value, cancellationToken);
        return result is null ? NotFound() : Ok(RevealMapping.ToResponse(result));
    }

    /// <summary>The Approved Investigator's Clues, newest first, for the Keeper. 404 for anyone else.</summary>
    [HttpGet("{investigatorId:guid}/clues")]
    public async Task<ActionResult<CluesResponse>> GetForInvestigator(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _reveals.ListInvestigatorCluesAsync(campaignId, accountId.Value, investigatorId, cancellationToken);
        return result is null ? NotFound() : Ok(RevealMapping.ToResponse(result));
    }
}
