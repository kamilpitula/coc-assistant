namespace CocAssistant.CampaignPlay.Domain;

/// <summary>The result of an Account attempting to join a Campaign through a Campaign Invite.</summary>
public enum JoinCampaignOutcome
{
    Joined,
    InvalidInvite,
    LimitReached,
    AlreadyMember,
    KeeperCannotJoin,
}
