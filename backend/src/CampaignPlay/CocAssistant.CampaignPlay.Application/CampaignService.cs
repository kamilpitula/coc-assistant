namespace CocAssistant.CampaignPlay.Application;

/// <summary>Creates Campaigns and enforces the Keeper ownership boundary on reads.</summary>
public class CampaignService
{
    private readonly ICampaignRepository _campaigns;
    private readonly TimeProvider _timeProvider;

    public CampaignService(ICampaignRepository campaigns, TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _timeProvider = timeProvider;
    }

    /// <summary>Creates a Campaign for the Keeper; a null Player limit falls back to the Campaign default.</summary>
    public async Task<Campaign> CreateCampaignAsync(
        string name,
        Guid keeperAccountId,
        int? playerLimit,
        CancellationToken cancellationToken)
    {
        var campaign = new Campaign(
            name,
            keeperAccountId,
            _timeProvider.GetUtcNow(),
            playerLimit ?? Campaign.DefaultPlayerLimit);
        _campaigns.Add(campaign);
        await _campaigns.SaveChangesAsync(cancellationToken);
        return campaign;
    }

    /// <summary>Returns the Campaign only when the requesting Account is its Keeper; otherwise null.</summary>
    public async Task<Campaign?> GetForKeeperAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        return campaign is not null && campaign.IsKeeper(accountId) ? campaign : null;
    }
}
