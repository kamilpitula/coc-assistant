namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Wall Entry authorship and visibility (specs/campaign-play/spec.md, Constraints; specs/campaign-wall/ux.md section 1):
/// the Keeper authors Public and Keeper-only entries, a Player authors Public entries only, and only the Keeper reads
/// Keeper-only entries or removes entries.
/// </summary>
public class WallEntryTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid StrangerAccountId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 19, 2, 0, TimeSpan.Zero);

    private static Campaign CampaignWithPlayer()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, Now);
        campaign.IssueInvite("token", Now);
        campaign.Join(PlayerAccountId, "token", Now);
        return campaign;
    }

    [Theory]
    [InlineData(WallEntryVisibility.Public)]
    [InlineData(WallEntryVisibility.KeeperOnly)]
    public void Given_the_keeper_When_authoring_an_entry_Then_it_is_created_with_the_chosen_visibility(WallEntryVisibility visibility)
    {
        var campaign = CampaignWithPlayer();

        var authoring = WallEntry.Author(campaign, KeeperAccountId, "The lamp goes out.", visibility, Now);

        Assert.Equal(WallEntryAuthoringOutcome.Created, authoring.Outcome);
        Assert.Equal(campaign.Id, authoring.Entry!.CampaignId);
        Assert.Equal(KeeperAccountId, authoring.Entry.AuthorAccountId);
        Assert.Equal(visibility, authoring.Entry.Visibility);
        Assert.Equal("The lamp goes out.", authoring.Entry.Text);
        Assert.Equal(Now, authoring.Entry.CreatedAt);
        Assert.NotEqual(Guid.Empty, authoring.Entry.Id);
    }

    [Fact]
    public void Given_a_player_When_authoring_a_public_entry_Then_it_is_created()
    {
        var authoring = WallEntry.Author(CampaignWithPlayer(), PlayerAccountId, "I search the desk.", WallEntryVisibility.Public, Now);

        Assert.Equal(WallEntryAuthoringOutcome.Created, authoring.Outcome);
        Assert.Equal(PlayerAccountId, authoring.Entry!.AuthorAccountId);
    }

    [Fact]
    public void Given_a_player_When_authoring_a_keeper_only_entry_Then_it_is_refused_and_nothing_is_created()
    {
        var authoring = WallEntry.Author(CampaignWithPlayer(), PlayerAccountId, "A secret.", WallEntryVisibility.KeeperOnly, Now);

        Assert.Equal(WallEntryAuthoringOutcome.PlayersCanOnlyAuthorPublic, authoring.Outcome);
        Assert.Null(authoring.Entry);
    }

    [Fact]
    public void Given_a_stranger_When_authoring_an_entry_Then_it_is_refused()
    {
        var authoring = WallEntry.Author(CampaignWithPlayer(), StrangerAccountId, "Hello.", WallEntryVisibility.Public, Now);

        Assert.Equal(WallEntryAuthoringOutcome.NotAMember, authoring.Outcome);
        Assert.Null(authoring.Entry);
    }

    [Fact]
    public void Given_text_with_surrounding_whitespace_When_authoring_Then_the_text_is_trimmed()
    {
        var authoring = WallEntry.Author(CampaignWithPlayer(), KeeperAccountId, "  Door creaks.\n", WallEntryVisibility.Public, Now);

        Assert.Equal("Door creaks.", authoring.Entry!.Text);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   \n\t ")]
    public void Given_empty_text_When_authoring_Then_the_text_is_invalid(string text)
    {
        var authoring = WallEntry.Author(CampaignWithPlayer(), KeeperAccountId, text, WallEntryVisibility.Public, Now);

        Assert.Equal(WallEntryAuthoringOutcome.InvalidText, authoring.Outcome);
    }

    [Fact]
    public void Given_text_of_the_maximum_length_When_authoring_Then_it_is_accepted_and_one_more_is_not()
    {
        var campaign = CampaignWithPlayer();

        var atLimit = WallEntry.Author(campaign, KeeperAccountId, new string('a', 2000), WallEntryVisibility.Public, Now);
        var overLimit = WallEntry.Author(campaign, KeeperAccountId, new string('a', 2001), WallEntryVisibility.Public, Now);

        Assert.Equal(WallEntryAuthoringOutcome.Created, atLimit.Outcome);
        Assert.Equal(WallEntryAuthoringOutcome.InvalidText, overLimit.Outcome);
    }

    [Fact]
    public void Given_a_keeper_only_entry_When_checking_who_can_read_it_Then_only_the_keeper_can()
    {
        var campaign = CampaignWithPlayer();
        var entry = WallEntry.Author(campaign, KeeperAccountId, "Secret.", WallEntryVisibility.KeeperOnly, Now).Entry!;

        Assert.True(entry.CanBeReadBy(campaign, KeeperAccountId));
        Assert.False(entry.CanBeReadBy(campaign, PlayerAccountId));
        Assert.False(entry.CanBeReadBy(campaign, StrangerAccountId));
    }

    [Fact]
    public void Given_a_public_entry_When_checking_who_can_read_it_Then_every_member_but_no_stranger_can()
    {
        var campaign = CampaignWithPlayer();
        var entry = WallEntry.Author(campaign, KeeperAccountId, "Known.", WallEntryVisibility.Public, Now).Entry!;

        Assert.True(entry.CanBeReadBy(campaign, KeeperAccountId));
        Assert.True(entry.CanBeReadBy(campaign, PlayerAccountId));
        Assert.False(entry.CanBeReadBy(campaign, StrangerAccountId));
    }

    [Fact]
    public void Given_an_entry_When_checking_who_can_remove_it_Then_only_the_keeper_can_even_for_the_players_own_entry()
    {
        var campaign = CampaignWithPlayer();
        var entry = WallEntry.Author(campaign, PlayerAccountId, "Mine.", WallEntryVisibility.Public, Now).Entry!;

        Assert.True(entry.CanBeRemovedBy(campaign, KeeperAccountId));
        Assert.False(entry.CanBeRemovedBy(campaign, PlayerAccountId));
        Assert.False(entry.CanBeRemovedBy(campaign, StrangerAccountId));
    }

    [Theory]
    [InlineData(WallEntryVisibility.Public)]
    [InlineData(WallEntryVisibility.KeeperOnly)]
    public void Given_a_created_entry_When_authoring_Then_wall_entry_added_is_raised_with_the_visibility(WallEntryVisibility visibility)
    {
        var campaign = CampaignWithPlayer();

        var entry = WallEntry.Author(campaign, KeeperAccountId, "The lamp goes out.", visibility, Now).Entry!;

        var raised = Assert.Single(entry.DomainEvents);
        Assert.Equal(new WallEntryAdded(campaign.Id, entry.Id, visibility), raised);
    }

    [Fact]
    public void Given_a_refused_authoring_When_authoring_Then_no_event_is_raised()
    {
        var campaign = CampaignWithPlayer();

        var refusedKeeperOnly = WallEntry.Author(campaign, PlayerAccountId, "A secret.", WallEntryVisibility.KeeperOnly, Now);
        var refusedStranger = WallEntry.Author(campaign, StrangerAccountId, "Hello.", WallEntryVisibility.Public, Now);
        var refusedText = WallEntry.Author(campaign, KeeperAccountId, " ", WallEntryVisibility.Public, Now);

        Assert.All([refusedKeeperOnly, refusedStranger, refusedText], authoring => Assert.Null(authoring.Entry));
    }

    [Theory]
    [InlineData(WallEntryVisibility.Public)]
    [InlineData(WallEntryVisibility.KeeperOnly)]
    public void Given_an_entry_When_the_keeper_removes_it_Then_wall_entry_removed_is_raised_with_the_visibility(WallEntryVisibility visibility)
    {
        var campaign = CampaignWithPlayer();
        var entry = WallEntry.Author(campaign, KeeperAccountId, "Gone soon.", visibility, Now).Entry!;
        entry.ClearDomainEvents();

        var removed = entry.Remove(campaign, KeeperAccountId);

        Assert.True(removed);
        var raised = Assert.Single(entry.DomainEvents);
        Assert.Equal(new WallEntryRemoved(campaign.Id, entry.Id, visibility), raised);
    }

    [Fact]
    public void Given_an_entry_When_a_player_or_stranger_tries_to_remove_it_Then_it_returns_false_and_raises_nothing()
    {
        var campaign = CampaignWithPlayer();
        var entry = WallEntry.Author(campaign, PlayerAccountId, "Mine.", WallEntryVisibility.Public, Now).Entry!;
        entry.ClearDomainEvents();

        Assert.False(entry.Remove(campaign, PlayerAccountId));
        Assert.False(entry.Remove(campaign, StrangerAccountId));

        Assert.Empty(entry.DomainEvents);
    }
}
