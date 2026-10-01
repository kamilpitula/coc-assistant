namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Keeper management of a Campaign's active Invite and the Player join workflow.</summary>
[Route("api/campaigns")]
public class CampaignMembershipController : CampaignPlayControllerBase
{
    private readonly CampaignMembershipService _membershipService;

    public CampaignMembershipController(CampaignMembershipService membershipService, AccountService accountService)
        : base(accountService)
    {
        _membershipService = membershipService;
    }

    /// <summary>Returns the active Invite for the Keeper, issuing one when none exists; 404 for non-Keepers.</summary>
    [HttpPost("{id:guid}/invite")]
    public async Task<ActionResult<InviteResponse>> Issue(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var invite = await _membershipService.IssueInviteAsync(id, accountId.Value, cancellationToken);
        return invite is null ? NotFound() : Ok(ToResponse(invite));
    }

    /// <summary>Replaces the active Invite with one bearing a new token; 404 for non-Keepers.</summary>
    [HttpPost("{id:guid}/invite/replace")]
    public async Task<ActionResult<InviteResponse>> Replace(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var invite = await _membershipService.ReplaceInviteAsync(id, accountId.Value, cancellationToken);
        return invite is null ? NotFound() : Ok(ToResponse(invite));
    }

    /// <summary>Returns the Keeper's active Invite; 404 when none is active or the caller is not the Keeper.</summary>
    [HttpGet("{id:guid}/invite")]
    public async Task<ActionResult<InviteResponse>> GetActive(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var invite = await _membershipService.GetActiveInviteAsync(id, accountId.Value, cancellationToken);
        return invite is null ? NotFound() : Ok(ToResponse(invite));
    }

    /// <summary>Revokes the Keeper's active Invite; 404 for non-Keepers or when none is active.</summary>
    [HttpDelete("{id:guid}/invite")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var outcome = await _membershipService.RevokeInviteAsync(id, accountId.Value, cancellationToken);
        return outcome == RevokeInviteOutcome.Revoked ? NoContent() : NotFound();
    }

    /// <summary>Admits the authenticated caller as a Player through the Invite token.</summary>
    [HttpPost("join")]
    public async Task<ActionResult<JoinCampaignResponse>> Join(JoinCampaignRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _membershipService.JoinAsync(request.Token, accountId.Value, cancellationToken);
        return result.Outcome switch
        {
            JoinCampaignOutcome.Joined when !result.Conflict => Ok(new JoinCampaignResponse("Joined", result.Campaign!.Id)),
            JoinCampaignOutcome.AlreadyMember => Ok(new JoinCampaignResponse("AlreadyMember", result.Campaign!.Id)),
            JoinCampaignOutcome.Joined => Conflict(new JoinCampaignResponse("LimitReached", null)),
            JoinCampaignOutcome.LimitReached => Conflict(new JoinCampaignResponse("LimitReached", null)),
            JoinCampaignOutcome.KeeperCannotJoin => BadRequest(new JoinCampaignResponse("KeeperCannotJoin", null)),
            _ => NotFound(),
        };
    }

    private static InviteResponse ToResponse(CampaignInvite invite) =>
        new(invite.CampaignId, invite.Token, invite.Status.ToString());
}
