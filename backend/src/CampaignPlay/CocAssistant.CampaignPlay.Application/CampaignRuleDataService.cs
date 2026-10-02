namespace CocAssistant.CampaignPlay.Application;

/// <summary>Serves the rule data for a Campaign's Era to its members (the Keeper and its Players).</summary>
public class CampaignRuleDataService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IReadOnlyList<IEraRuleData> _ruleDataByEra;

    public CampaignRuleDataService(ICampaignRepository campaigns, IEnumerable<IEraRuleData> ruleDataByEra)
    {
        _campaigns = campaigns;
        _ruleDataByEra = ruleDataByEra.ToList();
    }

    /// <summary>Returns the Occupation catalog for the Campaign's Era; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<OccupationCatalog?> GetOccupationsAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsMember(accountId))
        {
            return null;
        }

        return RuleDataFor(campaign.Era).Occupations;
    }

    private IEraRuleData RuleDataFor(Era era) =>
        _ruleDataByEra.SingleOrDefault(ruleData => ruleData.Era == era)
        ?? throw new InvalidOperationException($"No rule data is registered for the {era} Era.");
}
