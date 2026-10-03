namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>Connection group names of the Campaign hub (ADR 0009) and the group of each live update audience.</summary>
public static class CampaignHubGroups
{
    public static string Campaign(Guid campaignId) => $"campaign:{campaignId}";

    public static string CampaignKeeper(Guid campaignId) => $"campaign:{campaignId}:keeper";

    public static string Account(Guid accountId) => $"account:{accountId}";

    public static string For(LiveAudience audience) => audience.Kind switch
    {
        LiveAudienceKind.Campaign => Campaign(audience.Id),
        LiveAudienceKind.CampaignKeeper => CampaignKeeper(audience.Id),
        LiveAudienceKind.Account => Account(audience.Id),
        _ => throw new ArgumentOutOfRangeException(nameof(audience), audience.Kind, "Unknown live audience."),
    };
}
