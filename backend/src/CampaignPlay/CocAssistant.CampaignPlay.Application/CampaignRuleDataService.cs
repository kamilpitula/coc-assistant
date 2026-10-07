namespace CocAssistant.CampaignPlay.Application;

/// <summary>The skills a Campaign's Character Sheets use: the Era's skill catalog, the specialized skills, and suggestions.</summary>
public sealed record SkillRuleData(
    SkillCatalog Skills,
    SkillSpecializationCatalog Specializations,
    IReadOnlyDictionary<string, IReadOnlyList<string>> SpecializationSuggestions);

/// <summary>Serves the rule data for a Campaign's Era to its members (the Keeper and its Players).</summary>
public class CampaignRuleDataService
{
    private readonly ICampaignRepository _campaigns;
    private readonly CreationRuleSets _ruleSets;

    public CampaignRuleDataService(ICampaignRepository campaigns, CreationRuleSets ruleSets)
    {
        _campaigns = campaigns;
        _ruleSets = ruleSets;
    }

    /// <summary>Returns the Occupation catalog for the Campaign's Era; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<OccupationCatalog?> GetOccupationsAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await FindForMemberAsync(campaignId, accountId, cancellationToken);
        return campaign is null ? null : _ruleSets.EraRuleDataFor(campaign.Era).Occupations;
    }

    /// <summary>Returns the skills for the Campaign's Era; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<SkillRuleData?> GetSkillsAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await FindForMemberAsync(campaignId, accountId, cancellationToken);
        if (campaign is null)
        {
            return null;
        }

        var rules = _ruleSets.For(campaign.Era);
        return new SkillRuleData(rules.Skills, rules.Specializations, SpecializationSuggestions.From(rules));
    }

    private async Task<Campaign?> FindForMemberAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        return campaign is not null && campaign.IsMember(accountId) ? campaign : null;
    }
}
