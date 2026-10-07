namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Rule data for a Campaign's Era, readable by its members (the Keeper and its Players).</summary>
[Route("api/campaigns/{campaignId:guid}/rules")]
public class CampaignRulesController : CampaignPlayControllerBase
{
    private readonly CampaignRuleDataService _ruleDataService;

    public CampaignRulesController(CampaignRuleDataService ruleDataService, AccountService accountService)
        : base(accountService)
    {
        _ruleDataService = ruleDataService;
    }

    /// <summary>Returns the Occupation catalog for the Campaign's Era; 404 for non-members.</summary>
    [HttpGet("occupations")]
    public async Task<ActionResult<OccupationCatalogResponse>> GetOccupations(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var catalog = await _ruleDataService.GetOccupationsAsync(campaignId, accountId.Value, cancellationToken);
        return catalog is null ? NotFound() : Ok(OccupationCatalogResponse.From(catalog));
    }

    /// <summary>Returns the skills, specialized skills, and suggestions for the Campaign's Era; 404 for non-members.</summary>
    [HttpGet("skills")]
    public async Task<ActionResult<SkillCatalogResponse>> GetSkills(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var skills = await _ruleDataService.GetSkillsAsync(campaignId, accountId.Value, cancellationToken);
        return skills is null ? NotFound() : Ok(SkillCatalogResponse.From(skills));
    }
}
