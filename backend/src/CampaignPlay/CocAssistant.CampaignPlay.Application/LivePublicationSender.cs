namespace CocAssistant.CampaignPlay.Application;

/// <summary>Publishes each <see cref="LivePublication"/> a policy decided, in order.</summary>
internal static class LivePublicationSender
{
    public static async Task PublishAllAsync(
        ICampaignLiveUpdates liveUpdates,
        Guid campaignId,
        IReadOnlyList<LivePublication> publications,
        CancellationToken cancellationToken)
    {
        foreach (var publication in publications)
        {
            await liveUpdates.PublishCampaignDataChangedAsync(publication.Audience, campaignId, publication.Topics, cancellationToken);
        }
    }
}
