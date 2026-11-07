namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// What Campaign Play publishes when an Item changes holder (PBI-SPL-003 D5, ADR 0009): the Keeper hears sceneReveals, the gaining
/// account hears myItems and myClues, a different losing account hears myItems, and the Campaign never hears it.
/// </summary>
public class ItemHolderPublicationTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");
    private static readonly Guid HarveyAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000011");
    private static readonly Guid LucyAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000012");

    private static IEnumerable<string> Describe(IEnumerable<LivePublication> publications) =>
        publications.Select(publication => $"{publication.Audience.Kind}:{string.Join(',', publication.Topics)}");

    [Fact]
    public void Given_a_give_to_a_new_holder_When_choosing_publications_Then_the_keeper_and_the_gainer_only_are_told()
    {
        var publications = CampaignLivePublicationPolicy.ForItemHolderChanged(CampaignId, HarveyAccountId, null);

        Assert.Equal(
            Describe(
            [
                new LivePublication(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.SceneReveals]),
                new LivePublication(LiveAudience.Account(HarveyAccountId), [CampaignDataTopic.MyItems, CampaignDataTopic.MyClues]),
            ]),
            Describe(publications));
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
    }

    [Fact]
    public void Given_a_move_between_holders_When_choosing_publications_Then_the_loser_is_also_told_myItems()
    {
        var publications = CampaignLivePublicationPolicy.ForItemHolderChanged(CampaignId, LucyAccountId, HarveyAccountId);

        Assert.Equal(
            Describe(
            [
                new LivePublication(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.SceneReveals]),
                new LivePublication(LiveAudience.Account(LucyAccountId), [CampaignDataTopic.MyItems, CampaignDataTopic.MyClues]),
                new LivePublication(LiveAudience.Account(HarveyAccountId), [CampaignDataTopic.MyItems]),
            ]),
            Describe(publications));
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
    }

    [Fact]
    public void Given_a_take_back_When_choosing_publications_Then_the_former_holder_hears_myItems_but_no_myClues()
    {
        var publications = CampaignLivePublicationPolicy.ForItemHolderChanged(CampaignId, null, HarveyAccountId);

        Assert.Equal(
            Describe(
            [
                new LivePublication(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.SceneReveals]),
                new LivePublication(LiveAudience.Account(HarveyAccountId), [CampaignDataTopic.MyItems]),
            ]),
            Describe(publications));
        Assert.DoesNotContain(publications.SelectMany(publication => publication.Topics), topic => topic == CampaignDataTopic.MyClues);
    }

    [Fact]
    public void Given_the_same_account_gains_and_loses_When_choosing_publications_Then_the_account_is_told_once()
    {
        var publications = CampaignLivePublicationPolicy.ForItemHolderChanged(CampaignId, HarveyAccountId, HarveyAccountId);

        Assert.Equal(2, publications.Count);
        Assert.Equal([LiveAudience.CampaignKeeper(CampaignId), LiveAudience.Account(HarveyAccountId)], publications.Select(publication => publication.Audience).ToList());
    }

    [Fact]
    public void Given_the_new_topic_When_sent_on_the_wire_Then_its_name_is_myItems()
    {
        Assert.Equal("myItems", JsonNamingPolicy.CamelCase.ConvertName(CampaignDataTopic.MyItems.ToString()));
    }

    [Fact]
    public async Task Given_a_move_When_published_Then_the_keeper_gets_sceneReveals_the_gainer_myItems_and_myClues_and_the_loser_myItems()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();

        await new PublishItemHolderChanged(liveUpdates).PublishAsync(CampaignId, LucyAccountId, HarveyAccountId, CancellationToken.None);

        Assert.Equal(
            [
                new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.SceneReveals)),
                new PublishedCampaignDataChanged(LiveAudience.Account(LucyAccountId), CampaignId, $"{nameof(CampaignDataTopic.MyItems)},{nameof(CampaignDataTopic.MyClues)}"),
                new PublishedCampaignDataChanged(LiveAudience.Account(HarveyAccountId), CampaignId, nameof(CampaignDataTopic.MyItems)),
            ],
            liveUpdates.Published);
    }
}
