namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// What Campaign Play provides to Scenario Preparation (ADR 0036): the Keeper-only scenes publication
/// (specs/scene-play/spec.md, Live updates; PBI-SPL-008 design record).
/// </summary>
public class SceneContentSupportTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");

    [Fact]
    public void Given_a_scene_content_change_When_choosing_publications_Then_only_the_keeper_hears_scenes()
    {
        var publications = CampaignLivePublicationPolicy.ForScenesChanged(CampaignId);

        var publication = Assert.Single(publications);
        Assert.Equal(LiveAudience.CampaignKeeper(CampaignId), publication.Audience);
        Assert.Equal([CampaignDataTopic.Scenes], publication.Topics);
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Account);
    }

    [Fact]
    public void Given_the_scenes_topic_When_sent_on_the_wire_Then_its_name_is_scenes()
    {
        Assert.Equal("scenes", JsonNamingPolicy.CamelCase.ConvertName(nameof(CampaignDataTopic.Scenes)));
    }

    [Fact]
    public async Task Given_a_scene_content_change_When_published_Then_the_scenes_topic_goes_to_the_keeper_only()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();

        await new PublishScenesChanged(liveUpdates).PublishAsync(CampaignId, CancellationToken.None);

        Assert.Equal(
            [new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.Scenes))],
            liveUpdates.Published);
    }
}
