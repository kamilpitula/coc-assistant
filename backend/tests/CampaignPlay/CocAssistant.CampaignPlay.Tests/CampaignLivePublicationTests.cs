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

    private static readonly Guid OwnerAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-00000000000b");
    private static readonly Guid InvestigatorId = Guid.Parse("dddddddd-0000-0000-0000-00000000000c");

    private static readonly LivePublication KeeperInvestigators =
        new(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.Investigators]);

    private static readonly LivePublication OwnerMyInvestigator =
        new(LiveAudience.Account(OwnerAccountId), [CampaignDataTopic.MyInvestigator]);

    private static string Describe(IReadOnlyList<LivePublication> publications) =>
        string.Join(";", publications.Select(publication =>
            $"{publication.Audience.Kind}:{publication.Audience.Id}:{string.Join(",", publication.Topics)}"));

    [Fact]
    public void Given_a_public_wall_entry_When_choosing_publications_Then_wall_entries_goes_to_the_campaign()
    {
        var publications = CampaignLivePublicationPolicy.ForWallEntryChanged(CampaignId, WallEntryVisibility.Public);

        Assert.Equal(
            Describe([new LivePublication(LiveAudience.Campaign(CampaignId), [CampaignDataTopic.WallEntries])]),
            Describe(publications));
    }

    [Theory]
    [InlineData(WallEntryVisibility.KeeperOnly)]
    [InlineData((WallEntryVisibility)99)]
    public void Given_a_non_public_wall_entry_When_choosing_publications_Then_nothing_goes_to_the_campaign(WallEntryVisibility visibility)
    {
        var publications = CampaignLivePublicationPolicy.ForWallEntryChanged(CampaignId, visibility);

        Assert.Equal(
            Describe([new LivePublication(LiveAudience.CampaignKeeper(CampaignId), [CampaignDataTopic.WallEntries])]),
            Describe(publications));
        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
    }

    [Fact]
    public void Given_an_investigator_change_When_choosing_publications_Then_the_keeper_and_the_owner_only_are_told()
    {
        var publications = CampaignLivePublicationPolicy.ForInvestigatorChanged(CampaignId, OwnerAccountId);

        Assert.Equal(Describe([KeeperInvestigators, OwnerMyInvestigator]), Describe(publications));
    }

    [Fact]
    public void Given_an_approval_When_choosing_publications_Then_the_campaign_also_hears_members()
    {
        var publications = CampaignLivePublicationPolicy.ForInvestigatorApproved(CampaignId, OwnerAccountId);

        Assert.Equal(
            Describe([KeeperInvestigators, OwnerMyInvestigator, new LivePublication(LiveAudience.Campaign(CampaignId), [CampaignDataTopic.Members])]),
            Describe(publications));
    }

    [Fact]
    public void Given_an_investigator_change_other_than_approval_When_choosing_publications_Then_the_campaign_is_never_told()
    {
        var publications = CampaignLivePublicationPolicy.ForInvestigatorChanged(CampaignId, OwnerAccountId);

        Assert.DoesNotContain(publications, publication => publication.Audience.Kind == LiveAudienceKind.Campaign);
    }

    [Fact]
    public async Task Given_public_wall_entry_events_When_handled_Then_the_campaign_is_told_wall_entries_changed()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();
        var handler = new PublishWallEntryChanges(liveUpdates);

        await handler.HandleAsync(new WallEntryAdded(CampaignId, Guid.NewGuid(), WallEntryVisibility.Public), CancellationToken.None);
        await handler.HandleAsync(new WallEntryRemoved(CampaignId, Guid.NewGuid(), WallEntryVisibility.Public), CancellationToken.None);

        var campaignWallEntries = new PublishedCampaignDataChanged(LiveAudience.Campaign(CampaignId), CampaignId, nameof(CampaignDataTopic.WallEntries));
        Assert.Equal([campaignWallEntries, campaignWallEntries], liveUpdates.Published);
    }

    [Fact]
    public async Task Given_a_keeper_only_wall_entry_events_When_handled_Then_only_the_keeper_group_is_published_to()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();
        var handler = new PublishWallEntryChanges(liveUpdates);

        await handler.HandleAsync(new WallEntryAdded(CampaignId, Guid.NewGuid(), WallEntryVisibility.KeeperOnly), CancellationToken.None);
        await handler.HandleAsync(new WallEntryRemoved(CampaignId, Guid.NewGuid(), WallEntryVisibility.KeeperOnly), CancellationToken.None);

        var keeperWallEntries = new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.WallEntries));
        Assert.Equal([keeperWallEntries, keeperWallEntries], liveUpdates.Published);
    }

    [Fact]
    public async Task Given_each_non_approval_investigator_event_When_handled_Then_the_keeper_and_the_owner_are_published_to()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();
        var handler = new PublishInvestigatorChanges(liveUpdates);

        await handler.HandleAsync(new InvestigatorCreated(CampaignId, InvestigatorId, OwnerAccountId), CancellationToken.None);
        await handler.HandleAsync(new InvestigatorSubmitted(CampaignId, InvestigatorId, OwnerAccountId), CancellationToken.None);
        await handler.HandleAsync(new InvestigatorChangesRequested(CampaignId, InvestigatorId, OwnerAccountId), CancellationToken.None);
        await handler.HandleAsync(new InvestigatorStartedOver(CampaignId, InvestigatorId, OwnerAccountId), CancellationToken.None);

        var keeper = new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.Investigators));
        var owner = new PublishedCampaignDataChanged(LiveAudience.Account(OwnerAccountId), CampaignId, nameof(CampaignDataTopic.MyInvestigator));
        Assert.Equal([keeper, owner, keeper, owner, keeper, owner, keeper, owner], liveUpdates.Published);
    }

    [Fact]
    public async Task Given_an_approval_When_handled_Then_the_campaign_is_also_told_members_changed()
    {
        var liveUpdates = new RecordingCampaignLiveUpdates();
        var handler = new PublishInvestigatorChanges(liveUpdates);

        await handler.HandleAsync(new InvestigatorApproved(CampaignId, InvestigatorId, OwnerAccountId), CancellationToken.None);

        Assert.Equal(
            [
                new PublishedCampaignDataChanged(LiveAudience.CampaignKeeper(CampaignId), CampaignId, nameof(CampaignDataTopic.Investigators)),
                new PublishedCampaignDataChanged(LiveAudience.Account(OwnerAccountId), CampaignId, nameof(CampaignDataTopic.MyInvestigator)),
                new PublishedCampaignDataChanged(LiveAudience.Campaign(CampaignId), CampaignId, nameof(CampaignDataTopic.Members)),
            ],
            liveUpdates.Published);
    }
}
