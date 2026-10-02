namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The owning Player's Investigator and Character Sheet endpoints; anyone else gets 404.</summary>
[Route("api/campaigns/{campaignId:guid}/investigators")]
public class PlayerInvestigatorController : InvestigatorControllerBase
{
    private readonly PlayerInvestigatorService _service;

    public PlayerInvestigatorController(PlayerInvestigatorService service, AccountService accountService)
        : base(accountService)
    {
        _service = service;
    }

    /// <summary>Creates the caller's Draft Investigator.</summary>
    [HttpPost]
    public async Task<ActionResult<InvestigatorSummaryResponse>> Create(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _service.CreateAsync(campaignId, accountId.Value, cancellationToken);
        return result.Outcome == InvestigatorCommandOutcome.Succeeded
            ? CreatedAtAction(nameof(GetMine), new { campaignId }, CharacterSheetWireFormat.ToSummary(result.Investigator!))
            : Failure(result.Outcome);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<InvestigatorSummaryResponse>> GetMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var investigator = await _service.GetMineAsync(campaignId, accountId.Value, cancellationToken);
        return investigator is null ? NotFound() : Ok(CharacterSheetWireFormat.ToSummary(investigator));
    }

    /// <summary>"Start over": deletes the caller's Draft Investigator.</summary>
    [HttpDelete("mine")]
    public async Task<IActionResult> DeleteMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _service.DeleteMineAsync(campaignId, accountId.Value, cancellationToken);
        return outcome == InvestigatorCommandOutcome.Succeeded ? NoContent() : Failure(outcome);
    }

    [HttpPost("mine/submit")]
    public async Task<ActionResult<InvestigatorSummaryResponse>> SubmitMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _service.SubmitMineAsync(campaignId, accountId.Value, cancellationToken);
        return result.Outcome == InvestigatorCommandOutcome.Succeeded
            ? Ok(CharacterSheetWireFormat.ToSummary(result.Investigator!))
            : Failure(result.Outcome, result.ValidationErrors);
    }

    [HttpGet("mine/character-sheet")]
    public async Task<ActionResult<CharacterSheetResponse>> GetMyCharacterSheet(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _service.GetMyCharacterSheetAsync(campaignId, accountId.Value, cancellationToken);
        return view is null ? NotFound() : Ok(CharacterSheetWireFormat.ToCharacterSheetResponse(view));
    }

    /// <summary>Replaces a Draft or Changes Requested Character Sheet and returns it recomputed with its problems.</summary>
    [HttpPut("mine/character-sheet")]
    public async Task<ActionResult<CharacterSheetResponse>> ReplaceMyCharacterSheet(
        Guid campaignId,
        CharacterSheetRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _service.ReplaceMyCharacterSheetAsync(
            campaignId, accountId.Value, CharacterSheetWireFormat.ToInputs(request), cancellationToken);
        return result.Outcome == InvestigatorCommandOutcome.Succeeded
            ? Ok(CharacterSheetWireFormat.ToCharacterSheetResponse(result.View!))
            : Failure(result.Outcome);
    }
}
