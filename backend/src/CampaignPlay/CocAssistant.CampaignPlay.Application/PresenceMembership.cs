namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Proof that an Account is a member of a Campaign, issued only by <see cref="CampaignPresenceService"/> after the
/// membership check, so a connection is recorded for Presence only after it was authorized.
/// </summary>
public sealed class PresenceMembership
{
    internal PresenceMembership(Guid campaignId, Guid memberId, CampaignRole role)
    {
        CampaignId = campaignId;
        MemberId = memberId;
        Role = role;
    }

    public Guid CampaignId { get; }

    public Guid MemberId { get; }

    public CampaignRole Role { get; }
}
