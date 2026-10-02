namespace CocAssistant.CampaignPlay.Controllers;

[Route("api/campaigns")]
public class CampaignController : CampaignPlayControllerBase
{
    private readonly CampaignService _campaignService;

    public CampaignController(CampaignService campaignService, AccountService accountService)
        : base(accountService)
    {
        _campaignService = campaignService;
    }

    /// <summary>Creates a Campaign owned by the authenticated caller as its Keeper.</summary>
    [HttpPost]
    public async Task<ActionResult<CampaignResponse>> Create(CreateCampaignRequest request, CancellationToken cancellationToken)
    {
        var keeperAccountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (keeperAccountId is null)
        {
            return Unauthorized();
        }

        var campaign = await _campaignService.CreateCampaignAsync(
            request.Name,
            keeperAccountId.Value,
            request.PlayerLimit,
            RulesOptionsWireFormat.ToEra(request.Era),
            RulesOptionsWireFormat.ToAllowedCreationMethods(request.AllowedCreationMethods),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, ToResponse(campaign));
    }

    /// <summary>
    /// Returns the Keeper view to the Keeper and the reduced Player view to a Player; 404 for everyone else.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var member = await _campaignService.GetForMemberAsync(id, accountId.Value, cancellationToken);
        return member switch
        {
            null => NotFound(),
            { Role: CampaignRole.Keeper } => Ok(ToResponse(member.Campaign)),
            _ => Ok(ToPlayerResponse(member.Campaign)),
        };
    }

    /// <summary>Replaces the allowed Creation Methods; only the Keeper may, so everyone else gets 404.</summary>
    [HttpPut("{campaignId:guid}/allowed-creation-methods")]
    public async Task<ActionResult<CampaignResponse>> ChangeAllowedCreationMethods(
        Guid campaignId,
        ChangeAllowedCreationMethodsRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var campaign = await _campaignService.ChangeAllowedCreationMethodsAsync(
            campaignId,
            accountId.Value,
            RulesOptionsWireFormat.ToAllowedCreationMethods(request.AllowedCreationMethods)!,
            cancellationToken);

        return campaign is null ? NotFound() : Ok(ToResponse(campaign));
    }

    private static CampaignResponse ToResponse(Campaign campaign) =>
        new(
            campaign.Id,
            campaign.Name,
            campaign.KeeperAccountId,
            campaign.PlayerLimit,
            campaign.Era.Code,
            RulesOptionsWireFormat.ToNames(campaign.AllowedCreationMethods),
            nameof(CampaignRole.Keeper));

    private static PlayerCampaignResponse ToPlayerResponse(Campaign campaign) =>
        new(
            campaign.Id,
            campaign.Name,
            campaign.Era.Code,
            RulesOptionsWireFormat.ToNames(campaign.AllowedCreationMethods),
            nameof(CampaignRole.Player));
}
