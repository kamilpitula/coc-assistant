namespace CocAssistant.CampaignPlay.Controllers;

[ApiController]
[Route("api/campaigns")]
[Authorize]
public class CampaignController : ControllerBase
{
    private readonly CampaignService _campaignService;
    private readonly AccountService _accountService;

    public CampaignController(CampaignService campaignService, AccountService accountService)
    {
        _campaignService = campaignService;
        _accountService = accountService;
    }

    /// <summary>Creates a Campaign owned by the authenticated caller as its Keeper.</summary>
    [HttpPost]
    public async Task<ActionResult<CampaignResponse>> Create(CreateCampaignRequest request, CancellationToken cancellationToken)
    {
        var keeperAccountId = await ResolveKeeperAccountIdAsync(cancellationToken);
        if (keeperAccountId is null)
        {
            return Unauthorized();
        }

        var campaign = await _campaignService.CreateCampaignAsync(request.Name, keeperAccountId.Value, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = campaign.Id },
            new CampaignResponse(campaign.Id, campaign.Name, campaign.KeeperAccountId));
    }

    /// <summary>Returns the Campaign only when the caller is its Keeper; otherwise 404 to keep it invisible.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CampaignResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveKeeperAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var campaign = await _campaignService.GetForKeeperAsync(id, accountId.Value, cancellationToken);
        if (campaign is null)
        {
            return NotFound();
        }

        return Ok(new CampaignResponse(campaign.Id, campaign.Name, campaign.KeeperAccountId));
    }

    private async Task<Guid?> ResolveKeeperAccountIdAsync(CancellationToken cancellationToken)
    {
        var entraObjectId = User.FindFirstValue("oid") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(entraObjectId))
        {
            return null;
        }

        var displayName = User.FindFirstValue("name") ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var email = User.FindFirstValue("emails") ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        var account = await _accountService.ProvisionAccountAsync(entraObjectId, displayName, email, cancellationToken);
        return account.Id;
    }
}
