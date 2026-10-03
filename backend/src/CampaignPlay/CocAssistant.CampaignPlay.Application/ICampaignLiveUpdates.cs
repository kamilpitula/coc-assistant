namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Application port that publishes live updates to connected Campaign Members (ADR 0009). Delivery is best-effort:
/// an adapter never lets a failed publish fail the caller. Implemented beside the Campaign hub (ADR 0012).
/// </summary>
public interface ICampaignLiveUpdates
{
    Task PublishPresenceChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        PresenceTransition transition,
        CancellationToken cancellationToken);

    Task PublishCampaignDataChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        IReadOnlyCollection<CampaignDataTopic> topics,
        CancellationToken cancellationToken);
}
