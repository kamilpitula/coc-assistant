namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// The publication policy and the members signal (specs/campaign-play/spec.md, Live connection contract, Audience;
/// ADR 0009): members and Presence changes go to every subscribed member of that Campaign only.
/// </summary>
public class CampaignLivePublicationTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");

    [Fact]
    public void Given_a_presence_change_When_choosing_its_audience_Then_it_is_every_member_of_that_campaign()
    {
        Assert.Equal(LiveAudience.Campaign(CampaignId), CampaignLivePublicationPolicy.ForPresenceChanged(CampaignId));
    }

    [Fact]
    public void Given_a_members_change_When_choosing_its_audience_Then_it_is_every_member_of_that_campaign()
    {
        Assert.Equal(LiveAudience.Campaign(CampaignId), CampaignLivePublicationPolicy.ForMembersChanged(CampaignId));
    }

    [Fact]
    public async Task Given_a_player_joined_When_the_event_is_handled_Then_the_members_topic_is_published_to_that_campaign()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();
        var handler = new PublishMembersChangedOnPlayerJoined(liveUpdates);

        await handler.HandleAsync(
            new PlayerJoinedCampaign(CampaignId, Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UnixEpoch),
            CancellationToken.None);

        Assert.Equal(
            [new PublishedCampaignDataChanged(LiveAudience.Campaign(CampaignId), CampaignId, nameof(CampaignDataTopic.Members))],
            liveUpdates.Published);
    }
}
