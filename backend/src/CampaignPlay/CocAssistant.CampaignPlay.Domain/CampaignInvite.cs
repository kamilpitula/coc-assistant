namespace CocAssistant.CampaignPlay.Domain;

/// <summary>The open-join mechanism a Keeper issues for a Campaign. Revoking or replacing it prevents further joins.</summary>
public class CampaignInvite
{
    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public string Token { get; private set; }
    public CampaignInviteStatus Status { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private CampaignInvite()
    {
        Token = string.Empty;
    }

    internal CampaignInvite(Guid campaignId, string token, DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentException("Invite token is required.", nameof(token));
        }

        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Token = token;
        Status = CampaignInviteStatus.Active;
        CreatedAt = createdAt;
    }

    public bool IsActive => Status == CampaignInviteStatus.Active;

    internal void Revoke() => Status = CampaignInviteStatus.Revoked;

    internal void Replace() => Status = CampaignInviteStatus.Replaced;
}
