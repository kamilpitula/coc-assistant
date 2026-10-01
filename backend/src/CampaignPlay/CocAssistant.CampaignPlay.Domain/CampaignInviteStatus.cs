namespace CocAssistant.CampaignPlay.Domain;

/// <summary>The lifecycle state of a Campaign Invite; only an Active Invite can admit Players.</summary>
public enum CampaignInviteStatus
{
    Active,
    Revoked,
    Replaced,
}
