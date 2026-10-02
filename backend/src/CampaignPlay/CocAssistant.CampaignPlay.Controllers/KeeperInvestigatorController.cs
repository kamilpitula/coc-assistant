namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The Keeper's Investigator list, review read, Character Approval, and Change Requests; anyone else gets 404.</summary>
[Route("api/campaigns/{campaignId:guid}/investigators")]
public class KeeperInvestigatorController : InvestigatorControllerBase
{
    private readonly KeeperInvestigatorService _service;

    public KeeperInvestigatorController(KeeperInvestigatorService service, AccountService accountService)
        : base(accountService)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InvestigatorListItemResponse>>> List(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var items = await _service.ListAsync(campaignId, accountId.Value, cancellationToken);
        return items is null ? NotFound() : Ok(items.Select(CharacterSheetWireFormat.ToListItem).ToList());
    }

    [HttpGet("{investigatorId:guid}")]
    public async Task<ActionResult<KeeperInvestigatorResponse>> Get(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var view = await _service.GetAsync(campaignId, investigatorId, accountId.Value, cancellationToken);
        return view is null ? NotFound() : Ok(CharacterSheetWireFormat.ToKeeperResponse(view));
    }

    /// <summary>Character Approval: Submitted -> Approved.</summary>
    [HttpPost("{investigatorId:guid}/approve")]
    public async Task<ActionResult<KeeperInvestigatorResponse>> Approve(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _service.ApproveAsync(campaignId, investigatorId, accountId.Value, cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>Submitted -> Changes Requested with the Keeper's comment.</summary>
    [HttpPost("{investigatorId:guid}/request-changes")]
    public async Task<ActionResult<KeeperInvestigatorResponse>> RequestChanges(
        Guid campaignId,
        Guid investigatorId,
        RequestChangesRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _service.RequestChangesAsync(campaignId, investigatorId, accountId.Value, request.Comment, cancellationToken);
        return ToActionResult(result);
    }

    private ActionResult<KeeperInvestigatorResponse> ToActionResult(CharacterSheetResult result) =>
        result.Outcome == InvestigatorCommandOutcome.Succeeded
            ? Ok(CharacterSheetWireFormat.ToKeeperResponse(result.View!))
            : Failure(result.Outcome);
}
