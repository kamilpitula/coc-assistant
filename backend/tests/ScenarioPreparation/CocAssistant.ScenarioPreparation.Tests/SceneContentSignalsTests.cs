namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Scenario Preparation's after-commit signal onto the Keeper-only scenes topic (ADR 0036): the adapter forwards to
/// Campaign Play's publisher, a failed publish never fails the caller, and cancellation still propagates.
/// </summary>
public class SceneContentSignalsTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");

    private sealed class RecordingLiveUpdates : CampaignPlayApplication.ICampaignLiveUpdates
    {
        public List<(CampaignPlayApplication.LiveAudience Audience, Guid CampaignId, IReadOnlyCollection<CampaignPlayApplication.CampaignDataTopic> Topics)> Published { get; } = [];

        public Task PublishPresenceChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            CampaignPlayPresence.PresenceTransition transition,
            CancellationToken cancellationToken) => Task.CompletedTask;

        public Task PublishCampaignDataChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            IReadOnlyCollection<CampaignPlayApplication.CampaignDataTopic> topics,
            CancellationToken cancellationToken)
        {
            Published.Add((audience, campaignId, topics));
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingLiveUpdates : CampaignPlayApplication.ICampaignLiveUpdates
    {
        public Task PublishPresenceChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            CampaignPlayPresence.PresenceTransition transition,
            CancellationToken cancellationToken) => Task.CompletedTask;

        public Task PublishCampaignDataChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            IReadOnlyCollection<CampaignPlayApplication.CampaignDataTopic> topics,
            CancellationToken cancellationToken) =>
            throw new InvalidOperationException("The hub is down.");
    }

    private sealed class CancellingLiveUpdates : CampaignPlayApplication.ICampaignLiveUpdates
    {
        public Task PublishPresenceChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            CampaignPlayPresence.PresenceTransition transition,
            CancellationToken cancellationToken) => Task.CompletedTask;

        public Task PublishCampaignDataChangedAsync(
            CampaignPlayApplication.LiveAudience audience,
            Guid campaignId,
            IReadOnlyCollection<CampaignPlayApplication.CampaignDataTopic> topics,
            CancellationToken cancellationToken) =>
            throw new OperationCanceledException();
    }

    [Fact]
    public async Task Given_a_scene_content_change_When_signalled_Then_the_keeper_group_is_told_scenes_for_this_campaign()
    {
        var liveUpdates = new RecordingLiveUpdates();
        var signals = new CampaignPlaySceneContentSignals(
            new CampaignPlayApplication.PublishScenesChanged(liveUpdates),
            new RecordingLogger<CampaignPlaySceneContentSignals>());

        await signals.ScenesChangedAsync(CampaignId, CancellationToken.None);

        var published = Assert.Single(liveUpdates.Published);
        Assert.Equal(CampaignPlayApplication.LiveAudience.CampaignKeeper(CampaignId), published.Audience);
        Assert.Equal(CampaignId, published.CampaignId);
        Assert.Equal([CampaignPlayApplication.CampaignDataTopic.Scenes], published.Topics);
    }

    [Fact]
    public async Task Given_the_publish_fails_When_signalled_Then_the_caller_still_succeeds_and_a_warning_is_logged()
    {
        var logger = new RecordingLogger<CampaignPlaySceneContentSignals>();
        var signals = new CampaignPlaySceneContentSignals(
            new CampaignPlayApplication.PublishScenesChanged(new ThrowingLiveUpdates()),
            logger);

        await signals.ScenesChangedAsync(CampaignId, CancellationToken.None);

        Assert.Contains(logger.Entries, entry => entry.Level == LogLevel.Warning);
    }

    [Fact]
    public async Task Given_cancellation_When_signalled_Then_it_propagates_instead_of_being_swallowed()
    {
        var signals = new CampaignPlaySceneContentSignals(
            new CampaignPlayApplication.PublishScenesChanged(new CancellingLiveUpdates()),
            new RecordingLogger<CampaignPlaySceneContentSignals>());

        await Assert.ThrowsAsync<OperationCanceledException>(() => signals.ScenesChangedAsync(CampaignId, CancellationToken.None));
    }
}
