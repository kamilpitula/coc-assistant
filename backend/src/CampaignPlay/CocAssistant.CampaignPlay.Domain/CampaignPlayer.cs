namespace CocAssistant.CampaignPlay.Domain;

/// <summary>A Player's membership in a Campaign, established by joining through an active Campaign Invite.</summary>
public class CampaignPlayer
{
    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid InviteId { get; private set; }
    public DateTimeOffset JoinedAt { get; private set; }

    private CampaignPlayer()
    {
    }

    internal CampaignPlayer(Guid campaignId, Guid accountId, Guid inviteId, DateTimeOffset joinedAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        AccountId = accountId;
        InviteId = inviteId;
        JoinedAt = joinedAt;
    }
}
