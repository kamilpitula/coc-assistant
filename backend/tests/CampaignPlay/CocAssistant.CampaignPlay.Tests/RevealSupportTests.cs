namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// What Campaign Play provides to Scene Play for Reveals (PBI-SPL-002 D6, ADR 0009): the Keeper hears sceneReveals, each targeted
/// Player's account hears myClues, and the Campaign never hears a Reveal.
/// </summary>
public class RevealSupportTests
{
    private static readonly Guid CampaignId = Guid.Parse("cccccccc-0000-0000-0000-00000000000a");
    private static readonly Guid HarveyAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000011");
    private static readonly Guid LucyAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000012");

    private static IEnumerable<string> Describe(IEnumerable<LivePublication> publications) =>
        publications.Select(publication => $"{publication.Audience.Kind}:{string.Join(',', publication.Topics)}");

    [Fact]
    public void Given_a_reveal_to_two_players_When_choosing_publications_Then_the_keeper_and_each_account_are_told_and_the_campaign_is_not()
    {
        var publications = CampaignLivePublicationPolicy.ForRevealMade(CampaignId, [HarveyAccountId, LucyAccountId]);

        Assert.Equal(
            Describe(
            [
                new LivePublication(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.SceneReveals]),
                new LivePublication(LiveAudience.Account(HarveyAccountId), [CampaignDataTopic.MyClues]),
                new LivePublication(LiveAudience.Account(LucyAccountId), [CampaignDataTopic.MyClues]),
            ]),
            Describe(publications));
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
        Assert.Equal(
            [LiveAudience.CampaignKeeper(CampaignId), LiveAudience.Account(HarveyAccountId), LiveAudience.Account(LucyAccountId)],
            publications.Select(publication => publication.Audience).ToList());
    }

    [Fact]
    public void Given_a_duplicate_recipient_account_When_choosing_publications_Then_the_account_is_told_once()
    {
        var publications = CampaignLivePublicationPolicy.ForRevealMade(CampaignId, [HarveyAccountId, HarveyAccountId]);

        Assert.Equal(2, publications.Count);
    }

    [Fact]
    public void Given_no_recipient_accounts_When_choosing_publications_Then_only_the_keeper_is_told()
    {
        var publication = Assert.Single(CampaignLivePublicationPolicy.ForRevealMade(CampaignId, []));

        Assert.Equal(LiveAudience.CampaignKeeper(CampaignId), publication.Audience);
        Assert.Equal([CampaignDataTopic.SceneReveals], publication.Topics);
    }

    [Fact]
    public void Given_the_new_topics_When_sent_on_the_wire_Then_their_names_are_myClues_and_sceneReveals()
    {
        Assert.Equal(["myClues", "sceneReveals"], new[] { CampaignDataTopic.MyClues, CampaignDataTopic.SceneReveals }.Select(topic => JsonNamingPolicy.CamelCase.ConvertName(topic.ToString())).ToList());
    }

    [Fact]
    public async Task Given_a_reveal_When_published_Then_the_keeper_gets_sceneReveals_and_each_account_myClues_and_nobody_else()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();

        await new PublishRevealMade(liveUpdates).PublishAsync(CampaignId, [HarveyAccountId], CancellationToken.None);

        Assert.Equal(
            [
                new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.SceneReveals)),
                new PublishedCampaignDataChanged(LiveAudience.Account(HarveyAccountId), CampaignId, nameof(CampaignDataTopic.MyClues)),
            ],
            liveUpdates.Published);
    }
}
