namespace CocAssistant.CampaignPlay.Application;

/// <summary>The result of a Keeper revoking a Campaign's active Invite.</summary>
public enum RevokeInviteOutcome
{
    NotAuthorized,
    NoActiveInvite,
    Revoked,
}
