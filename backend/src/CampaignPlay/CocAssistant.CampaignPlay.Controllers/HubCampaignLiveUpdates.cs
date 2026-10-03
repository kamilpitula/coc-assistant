namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// Publishes live updates through the Campaign hub's groups. It lives beside the hub because it needs the hub type
/// (ADR 0012). Delivery is best-effort: a failure is logged and never reaches the caller (ADR 0009).
/// </summary>
public sealed class HubCampaignLiveUpdates : ICampaignLiveUpdates
{
    private readonly IHubContext<CampaignHub, ICampaignClient> _hubContext;
    private readonly ILogger<HubCampaignLiveUpdates> _logger;

    public HubCampaignLiveUpdates(IHubContext<CampaignHub, ICampaignClient> hubContext, ILogger<HubCampaignLiveUpdates> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task PublishPresenceChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        PresenceTransition transition,
        CancellationToken cancellationToken) =>
        PublishSafelyAsync(
            nameof(ICampaignClient.PresenceChanged),
            () => _hubContext.Clients.Group(CampaignHubGroups.For(audience)).PresenceChanged(
                new PresenceChangedMessage(campaignId, transition.MemberId.ToString(), transition.Presence.ToString())));

    public Task PublishCampaignDataChangedAsync(
        LiveAudience audience,
        Guid campaignId,
        IReadOnlyCollection<CampaignDataTopic> topics,
        CancellationToken cancellationToken) =>
        PublishSafelyAsync(
            nameof(ICampaignClient.CampaignDataChanged),
            () => _hubContext.Clients.Group(CampaignHubGroups.For(audience)).CampaignDataChanged(
                new CampaignDataChangedMessage(campaignId, topics.Select(ToWireName).ToList())));

    private static string ToWireName(CampaignDataTopic topic) => JsonNamingPolicy.CamelCase.ConvertName(topic.ToString());

    private async Task PublishSafelyAsync(string eventName, Func<Task> publish)
    {
        try
        {
            await publish();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Publishing the live update {EventName} failed.", eventName);
        }
    }
}
