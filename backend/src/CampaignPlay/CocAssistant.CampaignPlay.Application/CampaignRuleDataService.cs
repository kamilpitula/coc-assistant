namespace CocAssistant.CampaignPlay.Application;

/// <summary>Serves the rule data for a Campaign's Era to its members (the Keeper and its Players).</summary>
public class CampaignRuleDataService
{
    private readonly ICampaignRepository _campaigns;
    private readonly EraRuleDataLookup _ruleDataByEra;

    public CampaignRuleDataService(ICampaignRepository campaigns, IEnumerable<IEraRuleData> ruleDataByEra)
    {
        _campaigns = campaigns;
        _ruleDataByEra = new EraRuleDataLookup(ruleDataByEra);
    }

    /// <summary>Returns the Occupation catalog for the Campaign's Era; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<OccupationCatalog?> GetOccupationsAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsMember(accountId))
        {
            return null;
        }

        return _ruleDataByEra.For(campaign.Era).Occupations;
    }
}
