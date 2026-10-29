namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// What Campaign Play provides to Scene Play (ADR 0024): the activeScene publication and the Approved Investigators read
/// (specs/scene-play/spec.md, Live updates; PBI-SPL-001 design record).
/// </summary>
public class ActiveSceneSupportTests : IDisposable
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");

    private readonly CampaignPlayScenario _scenario = new();

    public void Dispose() => _scenario.Dispose();

    [Fact]
    public void Given_an_active_scene_change_When_choosing_publications_Then_only_the_campaign_hears_activeScene()
    {
        var publications = CampaignLivePublicationPolicy.ForActiveSceneChanged(CampaignId);

        var publication = Assert.Single(publications);
        Assert.Equal(LiveAudience.Campaign(CampaignId), publication.Audience);
        Assert.Equal([CampaignDataTopic.ActiveScene], publication.Topics);
    }

    [Fact]
    public void Given_the_active_scene_topic_When_sent_on_the_wire_Then_its_name_is_activeScene()
    {
        Assert.Equal("activeScene", JsonNamingPolicy.CamelCase.ConvertName(nameof(CampaignDataTopic.ActiveScene)));
    }

    [Fact]
    public async Task Given_an_active_scene_change_When_published_Then_the_activeScene_topic_goes_to_the_campaign_only()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();

        await new PublishActiveSceneChanged(liveUpdates).PublishAsync(CampaignId, CancellationToken.None);

        Assert.Equal(
            [new PublishedCampaignDataChanged(LiveAudience.Campaign(CampaignId), CampaignId, nameof(CampaignDataTopic.ActiveScene))],
            liveUpdates.Published);
    }

    [Fact]
    public async Task Given_investigators_in_every_status_When_listing_approved_Then_only_approved_ones_of_this_campaign_are_returned_with_their_names()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.JoinAsPlayerAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        var approved = await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.ApproveAsync(campaignId, approved);
        await _scenario.CreateSubmittedAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId);
        var otherCampaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(otherCampaignId, CampaignPlayScenario.PlayerAccountId);
        await _scenario.ApproveAsync(otherCampaignId, await _scenario.CreateSubmittedAsync(otherCampaignId, CampaignPlayScenario.PlayerAccountId));
        var expectedName = (await _scenario.LoadInvestigatorAsync(campaignId, approved))!.CharacterSheet.Identity.Name;

        using var context = _scenario.Fixture.CreateContext();
        var listed = await new ApprovedInvestigatorQuery(_scenario.Fixture.CreateInvestigatorRepository(context)).ListAsync(campaignId, CancellationToken.None);

        Assert.Equal([new ApprovedInvestigator(approved, CampaignPlayScenario.PlayerAccountId, expectedName)], listed);
    }
}
