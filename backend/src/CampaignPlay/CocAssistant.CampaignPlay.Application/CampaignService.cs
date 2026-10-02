namespace CocAssistant.CampaignPlay.Application;

/// <summary>Creates Campaigns and enforces the Keeper ownership boundary on reads.</summary>
public class CampaignService
{
    private const int MaxRulesOptionsChangeAttempts = 3;

    private readonly ICampaignRepository _campaigns;
    private readonly TimeProvider _timeProvider;

    public CampaignService(ICampaignRepository campaigns, TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Creates a Campaign for the Keeper; a null Player limit, Era, or set of allowed Creation Methods
    /// falls back to the Campaign default.
    /// </summary>
    public async Task<Campaign> CreateCampaignAsync(
        string name,
        Guid keeperAccountId,
        int? playerLimit,
        Era? era,
        AllowedCreationMethods? allowedCreationMethods,
        CancellationToken cancellationToken)
    {
        var campaign = new Campaign(
            name,
            keeperAccountId,
            _timeProvider.GetUtcNow(),
            playerLimit ?? Campaign.DefaultPlayerLimit,
            era,
            allowedCreationMethods);
        _campaigns.Add(campaign);
        await _campaigns.SaveChangesAsync(cancellationToken);
        return campaign;
    }

    /// <summary>Returns the Campaign with the caller's role when the caller is a member; otherwise null.</summary>
    public async Task<MemberCampaign?> GetForMemberAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        var role = campaign?.RoleOf(accountId);
        return role is null ? null : new MemberCampaign(campaign!, role.Value);
    }

    /// <summary>Returns the Campaign only when the requesting Account is its Keeper; otherwise null.</summary>
    public async Task<Campaign?> GetForKeeperAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        return campaign is not null && campaign.IsKeeper(accountId) ? campaign : null;
    }

    /// <summary>
    /// Replaces the allowed Creation Methods for the Keeper; null when the Campaign is missing or the caller is not its Keeper.
    /// A concurrent join changes the membership concurrency token, so a lost race re-reads and reapplies the change.
    /// </summary>
    public async Task<Campaign?> ChangeAllowedCreationMethodsAsync(
        Guid campaignId,
        Guid keeperAccountId,
        AllowedCreationMethods allowedCreationMethods,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            var campaign = await GetForKeeperAsync(campaignId, keeperAccountId, cancellationToken);
            if (campaign is null)
            {
                return null;
            }

            campaign.ChangeAllowedCreationMethods(allowedCreationMethods);
            try
            {
                await _campaigns.SaveChangesAsync(cancellationToken);
                return campaign;
            }
            catch (CampaignMembershipConflictException) when (attempt < MaxRulesOptionsChangeAttempts)
            {
                _campaigns.DiscardPendingChanges();
            }
        }
    }
}
