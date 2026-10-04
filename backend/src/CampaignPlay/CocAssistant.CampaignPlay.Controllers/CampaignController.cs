namespace CocAssistant.CampaignPlay.Controllers;

[Route("api/campaigns")]
public class CampaignController : CampaignPlayControllerBase
{
    private readonly CampaignService _campaignService;
    private readonly CampaignListService _campaignListService;

    public CampaignController(CampaignService campaignService, CampaignListService campaignListService, AccountService accountService)
        : base(accountService)
    {
        _campaignService = campaignService;
        _campaignListService = campaignListService;
    }

    /// <summary>Lists every Campaign the caller is a Campaign Member of, each item shaped for the caller's role.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var items = await _campaignListService.ListAsync(accountId.Value, cancellationToken);
        return Ok(items.Select(ToListItemResponse).ToList());
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

    // Typed as object so each item is serialized with exactly its own role's properties.
    private static object ToListItemResponse(CampaignListItem item) =>
        item switch
        {
            KeeperCampaignListItem keeperItem => KeeperCampaignListItemResponse.From(keeperItem),
            PlayerCampaignListItem playerItem => PlayerCampaignListItemResponse.From(playerItem),
            _ => throw new ArgumentOutOfRangeException(nameof(item), item.GetType().Name, "Unknown Campaign List item."),
        };

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
