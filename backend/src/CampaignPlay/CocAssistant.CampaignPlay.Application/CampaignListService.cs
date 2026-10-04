namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Lists every Campaign the caller is a Campaign Member of (specs/campaign-list/spec.md, API and Projection):
/// Keeper Campaigns newest created first, then Player Campaigns newest joined first, each projected for its role.
/// </summary>
public class CampaignListService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IInvestigatorRepository _investigators;
    private readonly IAccountDisplayNames _displayNames;

    public CampaignListService(ICampaignRepository campaigns, IInvestigatorRepository investigators, IAccountDisplayNames displayNames)
    {
        _campaigns = campaigns;
        _investigators = investigators;
        _displayNames = displayNames;
    }

    public async Task<IReadOnlyList<CampaignListItem>> ListAsync(Guid callerAccountId, CancellationToken cancellationToken)
    {
        var campaigns = await _campaigns.ListForMemberAsync(callerAccountId, cancellationToken);
        if (campaigns.Count == 0)
        {
            return [];
        }

        var investigators = (await _investigators.ListForCampaignsAsync(campaigns.Select(campaign => campaign.Id).ToList(), cancellationToken))
            .ToLookup(investigator => investigator.CampaignId);
        var kept = campaigns.Where(campaign => campaign.IsKeeper(callerAccountId)).ToList();
        var joined = campaigns.Where(campaign => !campaign.IsKeeper(callerAccountId)).ToList();
        var keeperNames = await _displayNames.GetDisplayNamesAsync(
            joined.Select(campaign => campaign.KeeperAccountId).Distinct().ToList(), cancellationToken);

        var keeperItems = kept
            .OrderByDescending(campaign => campaign.CreatedAt)
            .ThenBy(campaign => campaign.Id)
            .Select(campaign => ProjectForKeeper(campaign, investigators[campaign.Id]));
        var playerItems = joined
            .OrderByDescending(campaign => JoinedAt(campaign, callerAccountId))
            .ThenBy(campaign => campaign.Id)
            .Select(campaign => ProjectForPlayer(campaign, investigators[campaign.Id], callerAccountId, keeperNames));

        return keeperItems.Concat<CampaignListItem>(playerItems).ToList();
    }

    private static DateTimeOffset JoinedAt(Campaign campaign, Guid accountId) =>
        campaign.Players.Single(player => player.AccountId == accountId).JoinedAt;

    private static int CountIn(IEnumerable<Investigator> investigators, InvestigatorStatus status) =>
        investigators.Count(investigator => investigator.Status == status);

    private static KeeperCampaignListItem ProjectForKeeper(Campaign campaign, IEnumerable<Investigator> investigators) =>
        new(
            campaign.Id,
            campaign.Name,
            campaign.Era,
            campaign.PlayerCount,
            campaign.PlayerLimit,
            CountIn(investigators, InvestigatorStatus.Approved),
            CountIn(investigators, InvestigatorStatus.Submitted));

    /// <summary>Counts only Approved Investigators, so other Players' unapproved progress stays hidden.</summary>
    private static PlayerCampaignListItem ProjectForPlayer(
        Campaign campaign,
        IEnumerable<Investigator> investigators,
        Guid callerAccountId,
        IReadOnlyDictionary<Guid, string> keeperNames)
    {
        var own = investigators.SingleOrDefault(investigator => investigator.PlayerAccountId == callerAccountId);
        return new(
            campaign.Id,
            campaign.Name,
            campaign.Era,
            keeperNames.GetValueOrDefault(campaign.KeeperAccountId) ?? string.Empty,
            campaign.PlayerCount,
            CountIn(investigators, InvestigatorStatus.Approved),
            own is null ? null : new OwnInvestigator(own.Status, own.CharacterSheet.Identity.Name));
    }
}
