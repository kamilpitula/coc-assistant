namespace CocAssistant.CampaignPlay.Controllers;

[Route("api/campaigns/{campaignId:guid}/members")]
public class CampaignMembersController : CampaignPlayControllerBase
{
    private readonly CampaignMemberService _memberService;

    public CampaignMembersController(CampaignMemberService memberService, AccountService accountService)
        : base(accountService)
    {
        _memberService = memberService;
    }

    /// <summary>The Campaign's roster for one of its members; 404 for everyone else.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CampaignMemberResponse>>> List(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var members = await _memberService.ListAsync(campaignId, accountId.Value, cancellationToken);
        return members is null ? NotFound() : Ok(members.Select(ToResponse).ToList());
    }

    private static CampaignMemberResponse ToResponse(CampaignMember member) =>
        new(member.MemberId.ToString(), member.DisplayName, member.Role.ToString(), member.IsYou);
}
