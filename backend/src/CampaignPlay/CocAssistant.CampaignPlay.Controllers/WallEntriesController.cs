namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// A Campaign's Wall for its members (specs/campaign-play/spec.md, Wall Entry API). Non-members get 404 on every call,
/// and nothing in a Player's responses depends on Keeper-only entries.
/// </summary>
[Route("api/campaigns/{campaignId:guid}/wall-entries")]
public class WallEntriesController : CampaignPlayControllerBase
{
    private readonly WallEntryService _wallEntryService;

    public WallEntriesController(WallEntryService wallEntryService, AccountService accountService)
        : base(accountService)
    {
        _wallEntryService = wallEntryService;
    }

    /// <summary>The newest entries the caller may read, with a cursor for older ones.</summary>
    [HttpGet]
    public async Task<ActionResult<WallEntryPageResponse>> List(
        Guid campaignId,
        [FromQuery, Range(1, 50)] int limit = 20,
        [FromQuery] string? cursor = null,
        CancellationToken cancellationToken = default)
    {
        WallEntryCursor? after = null;
        if (cursor is not null && !WallEntryCursor.TryParse(cursor, out after))
        {
            ModelState.AddModelError(nameof(cursor), "The cursor is not valid.");
            return ValidationProblem(ModelState);
        }

        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var page = await _wallEntryService.ListAsync(campaignId, accountId.Value, limit, after, cancellationToken);
        return page is null
            ? NotFound()
            : Ok(new WallEntryPageResponse(page.Entries.Select(WallEntryWireFormat.ToResponse).ToList(), page.NextCursor));
    }

    /// <summary>Adds an entry; a Player may add Public entries only.</summary>
    [HttpPost]
    public async Task<ActionResult<WallEntryResponse>> Add(
        Guid campaignId,
        AddWallEntryRequest request,
        CancellationToken cancellationToken)
    {
        if (!WallEntryWireFormat.TryParseVisibility(request.Visibility, out var visibility))
        {
            ModelState.AddModelError("visibility", "The visibility must be Public or KeeperOnly.");
            return ValidationProblem(ModelState);
        }

        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _wallEntryService.AddAsync(campaignId, accountId.Value, request.Text, visibility, cancellationToken);
        return result.Outcome switch
        {
            WallEntryAuthoringOutcome.Created => StatusCode(StatusCodes.Status201Created, WallEntryWireFormat.ToResponse(result.Entry!)),
            WallEntryAuthoringOutcome.NotAMember => NotFound(),
            WallEntryAuthoringOutcome.PlayersCanOnlyAuthorPublic => Invalid("visibility", "Players can only add Public Wall Entries."),
            _ => Invalid("text", $"The text must be between 1 and {WallEntry.TextMaxLength} characters."),
        };
    }

    /// <summary>Removes an entry; only the Keeper may, so everyone else gets the same 404 as for a missing entry.</summary>
    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> Remove(Guid campaignId, Guid entryId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _wallEntryService.RemoveAsync(campaignId, accountId.Value, entryId, cancellationToken);
        return outcome == RemoveWallEntryOutcome.Removed ? NoContent() : NotFound();
    }

    private ActionResult Invalid(string field, string message)
    {
        ModelState.AddModelError(field, message);
        return ValidationProblem(ModelState);
    }
}
