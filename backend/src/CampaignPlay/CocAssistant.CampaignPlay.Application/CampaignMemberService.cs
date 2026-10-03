namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Lists a Campaign's members for one of its members (specs/campaign-play/spec.md, Campaign members API), in the
/// ux.md section 5 order: the Keeper, then the caller, then the other Players by display name, case-insensitively.
/// Each Player's Investigator is projected for the caller (specs/campaign-overview/spec.md, Roster with Investigators).
/// </summary>
public class CampaignMemberService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IInvestigatorRepository _investigators;
    private readonly IAccountDisplayNames _displayNames;

    public CampaignMemberService(ICampaignRepository campaigns, IInvestigatorRepository investigators, IAccountDisplayNames displayNames)
    {
        _campaigns = campaigns;
        _investigators = investigators;
        _displayNames = displayNames;
    }

    /// <summary>The roster of the Campaign; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<IReadOnlyList<CampaignMember>?> ListAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsMember(callerAccountId))
        {
            return null;
        }

        var accountIds = campaign.Players.Select(player => player.AccountId).Prepend(campaign.KeeperAccountId).ToList();
        var names = await _displayNames.GetDisplayNamesAsync(accountIds, cancellationToken);
        var investigators = (await _investigators.ListForCampaignAsync(campaignId, cancellationToken))
            .ToDictionary(investigator => investigator.PlayerAccountId);
        var callerIsKeeper = campaign.IsKeeper(callerAccountId);

        var keeper = new CampaignMember(
            campaign.Id, NameOf(campaign.KeeperAccountId, names), CampaignRole.Keeper, campaign.KeeperAccountId == callerAccountId, null);
        var players = campaign.Players
            .Select(player => new CampaignMember(
                player.Id,
                NameOf(player.AccountId, names),
                CampaignRole.Player,
                player.AccountId == callerAccountId,
                Project(investigators.GetValueOrDefault(player.AccountId), callerIsKeeper, player.AccountId == callerAccountId)))
            .OrderByDescending(member => member.IsYou)
            .ThenBy(member => member.DisplayName, StringComparer.InvariantCultureIgnoreCase)
            .ThenBy(member => member.MemberId);

        return players.Prepend(keeper).ToList();
    }

    private static string NameOf(Guid accountId, IReadOnlyDictionary<Guid, string> names) =>
        names.GetValueOrDefault(accountId) ?? string.Empty;

    private static RosterInvestigator? Project(Investigator? investigator, bool callerIsKeeper, bool isOwn) =>
        callerIsKeeper ? ProjectForKeeper(investigator) : ProjectForPlayer(investigator, isOwn);

    /// <summary>The Keeper sees a Draft only as in progress, and every other status with its id.</summary>
    private static RosterInvestigator? ProjectForKeeper(Investigator? investigator)
    {
        if (investigator is null)
        {
            return null;
        }

        return investigator.IsVisibleToKeeper
            ? Visible(investigator, investigator.Id)
            : new RosterInvestigator(InvestigatorVisibility.InProgress, null, null, null);
    }

    /// <summary>A Player sees their own Investigator, and another Player's only once Approved; never another's id.</summary>
    private static RosterInvestigator? ProjectForPlayer(Investigator? investigator, bool isOwn)
    {
        if (isOwn)
        {
            return investigator is null ? null : Visible(investigator, null);
        }

        return investigator is { Status: InvestigatorStatus.Approved }
            ? Visible(investigator, null)
            : new RosterInvestigator(InvestigatorVisibility.NotReady, null, null, null);
    }

    private static RosterInvestigator Visible(Investigator investigator, Guid? id) =>
        new(InvestigatorVisibility.Visible, id, investigator.CharacterSheet.Identity.Name, investigator.Status);
}
