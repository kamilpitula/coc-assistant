namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Records what would be published to live connections, in order; the transport is a system boundary.</summary>
public sealed class RecordingCampaignLiveUpdates : ICampaignLiveUpdates
{
    public List<object> Published { get; } = [];

    public Task PublishPresenceChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        PresenceTransition transition,
        CancellationToken cancellationToken)
    {
        Published.Add(new PublishedPresenceChanged(audience, campaignId, transition));
        return Task.CompletedTask;
    }

    public Task PublishCampaignDataChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        IReadOnlyCollection<CampaignDataTopic> topics,
        CancellationToken cancellationToken)
    {
        Published.Add(new PublishedCampaignDataChanged(audience, campaignId, string.Join(",", topics)));
        return Task.CompletedTask;
    }
}

public sealed record PublishedPresenceChanged(LiveAudience Audience, Guid CampaignId, PresenceTransition Transition);

public sealed record PublishedCampaignDataChanged(LiveAudience Audience, Guid CampaignId, string Topics);
