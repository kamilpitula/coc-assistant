namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// The single mapping from an Account to its opaque, Campaign-stable memberId (specs/campaign-play/spec.md,
/// Campaign members API): the Keeper's memberId is the Campaign id and a Player's is their CampaignPlayer id.
/// </summary>
public static class CampaignMemberIds
{
    /// <summary>The Account's memberId in the Campaign, or null when it is not a Campaign Member.</summary>
    public static Guid? Of(Campaign campaign, Guid accountId)
    {
        if (campaign.IsKeeper(accountId))
        {
            return campaign.Id;
        }

        return campaign.Players.SingleOrDefault(player => player.AccountId == accountId)?.Id;
    }
}
