namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Lists a Campaign's members for one of its members (specs/campaign-play/spec.md, Campaign members API), in the
/// ux.md section 5 order: the Keeper, then the caller, then the other Players by display name, case-insensitively.
/// </summary>
public class CampaignMemberService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IAccountDisplayNames _displayNames;

    public CampaignMemberService(ICampaignRepository campaigns, IAccountDisplayNames displayNames)
    {
        _campaigns = campaigns;
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

        var keeper = ToMember(campaign.Id, campaign.KeeperAccountId, CampaignRole.Keeper, callerAccountId, names);
        var players = campaign.Players
            .Select(player => ToMember(player.Id, player.AccountId, CampaignRole.Player, callerAccountId, names))
            .OrderByDescending(member => member.IsYou)
            .ThenBy(member => member.DisplayName, StringComparer.InvariantCultureIgnoreCase)
            .ThenBy(member => member.MemberId);

        return players.Prepend(keeper).ToList();
    }

    private static CampaignMember ToMember(
        Guid memberId,
        Guid accountId,
        CampaignRole role,
        Guid callerAccountId,
        IReadOnlyDictionary<Guid, string> names) =>
        new(memberId, names.GetValueOrDefault(accountId) ?? string.Empty, role, accountId == callerAccountId);
}
