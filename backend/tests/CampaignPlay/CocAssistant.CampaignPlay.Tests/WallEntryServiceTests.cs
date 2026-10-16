namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Reading, adding, and removing Wall Entries (specs/campaign-play/spec.md, Wall Entry API). The hard invariant:
/// a Player never reads or infers Keeper-only entries through a list, a cursor, a count, or an error.
/// </summary>
public class WallEntryServiceTests : IDisposable
{
    private static readonly Guid Keeper = CampaignPlayScenario.KeeperAccountId;
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private static readonly Guid OtherPlayer = CampaignPlayScenario.OtherPlayerAccountId;
    private static readonly Guid Stranger = CampaignPlayScenario.StrangerAccountId;

    private readonly CampaignPlayScenario _scenario = new();

    public void Dispose() => _scenario.Dispose();

    private WallEntryService CreateService(CampaignPlayDbContext context) =>
        new(
            _scenario.Fixture.CreateRepository(context),
            _scenario.Fixture.CreateWallEntryRepository(context),
            new InMemoryAccountDisplayNames(),
            _scenario.TimeProvider);

    private async Task<Guid> CampaignWithPlayersAsync()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        await _scenario.JoinAsPlayerAsync(campaignId, OtherPlayer);
        return campaignId;
    }

    private async Task<AddWallEntryResult> AddAsync(Guid campaignId, Guid caller, string text, WallEntryVisibility visibility = WallEntryVisibility.Public)
    {
        _scenario.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = _scenario.Fixture.CreateContext();
        return await CreateService(context).AddAsync(campaignId, caller, text, visibility, CancellationToken.None);
    }

    private async Task<WallEntryPage?> ListAsync(Guid campaignId, Guid caller, int limit = 20, WallEntryCursor? after = null)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await CreateService(context).ListAsync(campaignId, caller, limit, after, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_keeper_When_adding_public_and_keeper_only_entries_Then_the_keeper_lists_both_newest_first_with_the_author_name()
    {
        var campaignId = await CampaignWithPlayersAsync();

        await AddAsync(campaignId, Keeper, "First.");
        await AddAsync(campaignId, Keeper, "Second, secret.", WallEntryVisibility.KeeperOnly);

        var page = await ListAsync(campaignId, Keeper);

        Assert.NotNull(page);
        Assert.Equal(
            [("Second, secret.", WallEntryVisibility.KeeperOnly, "Kate Keeper"), ("First.", WallEntryVisibility.Public, "Kate Keeper")],
            page.Entries.Select(entry => (entry.Text, entry.Visibility, entry.AuthorDisplayName)));
        Assert.Null(page.NextCursor);
    }

    [Fact]
    public async Task Given_a_keeper_only_entry_When_a_player_lists_the_wall_Then_it_is_absent_and_the_keeper_only_author_is_never_returned()
    {
        var campaignId = await CampaignWithPlayersAsync();
        await AddAsync(campaignId, Keeper, "Known to all.");
        await AddAsync(campaignId, Keeper, "Hidden.", WallEntryVisibility.KeeperOnly);
        await AddAsync(campaignId, Player, "My action.");

        var page = await ListAsync(campaignId, OtherPlayer);

        Assert.NotNull(page);
        Assert.Equal(["My action.", "Known to all."], page.Entries.Select(entry => entry.Text));
        Assert.All(page.Entries, entry => Assert.Equal(WallEntryVisibility.Public, entry.Visibility));
        Assert.Equal(["Ada Lovelace", "Kate Keeper"], page.Entries.Select(entry => entry.AuthorDisplayName));
    }

    [Fact]
    public async Task Given_a_player_When_adding_a_keeper_only_entry_Then_it_is_refused_and_nothing_is_stored()
    {
        var campaignId = await CampaignWithPlayersAsync();

        var result = await AddAsync(campaignId, Player, "Secret.", WallEntryVisibility.KeeperOnly);

        Assert.Equal(WallEntryAuthoringOutcome.PlayersCanOnlyAuthorPublic, result.Outcome);
        Assert.Null(result.Entry);
        Assert.Empty((await ListAsync(campaignId, Keeper))!.Entries);
    }

    [Fact]
    public async Task Given_a_stranger_or_a_missing_campaign_When_listing_or_adding_Then_the_caller_is_not_a_member()
    {
        var campaignId = await CampaignWithPlayersAsync();

        Assert.Null(await ListAsync(campaignId, Stranger));
        Assert.Null(await ListAsync(Guid.NewGuid(), Keeper));
        Assert.Equal(WallEntryAuthoringOutcome.NotAMember, (await AddAsync(campaignId, Stranger, "Hi.")).Outcome);
        Assert.Equal(WallEntryAuthoringOutcome.NotAMember, (await AddAsync(Guid.NewGuid(), Keeper, "Hi.")).Outcome);
    }

    [Fact]
    public async Task Given_empty_text_When_adding_Then_it_is_invalid_and_nothing_is_stored()
    {
        var campaignId = await CampaignWithPlayersAsync();

        var result = await AddAsync(campaignId, Keeper, "   ");

        Assert.Equal(WallEntryAuthoringOutcome.InvalidText, result.Outcome);
        Assert.Empty((await ListAsync(campaignId, Keeper))!.Entries);
    }

    [Fact]
    public async Task Given_entries_in_two_campaigns_When_listing_one_Then_only_its_own_entries_are_returned()
    {
        var campaignId = await CampaignWithPlayersAsync();
        var otherCampaignId = await _scenario.CreateCampaignAsync();
        await AddAsync(campaignId, Keeper, "Here.");
        await AddAsync(otherCampaignId, Keeper, "There.");

        var page = await ListAsync(campaignId, Keeper);

        Assert.Equal(["Here."], page!.Entries.Select(entry => entry.Text));
    }

    [Fact]
    public async Task Given_an_added_entry_When_reading_the_result_Then_it_carries_the_stored_id_text_visibility_time_and_author()
    {
        var campaignId = await CampaignWithPlayersAsync();

        var result = await AddAsync(campaignId, Player, "  I look around.  ");

        Assert.Equal(WallEntryAuthoringOutcome.Created, result.Outcome);
        Assert.Equal("I look around.", result.Entry!.Text);
        Assert.Equal("Ada Lovelace", result.Entry.AuthorDisplayName);
        Assert.Equal(_scenario.TimeProvider.GetUtcNow(), result.Entry.CreatedAt);
        Assert.Equal(result.Entry.Id, (await ListAsync(campaignId, Player))!.Entries.Single().Id);
    }

    [Fact]
    public async Task Given_interleaved_public_and_keeper_only_entries_When_a_player_pages_Then_pages_hold_only_public_entries_and_the_cursor_follows_visible_ones()
    {
        var campaignId = await CampaignWithPlayersAsync();
        for (var number = 1; number <= 7; number++)
        {
            await AddAsync(campaignId, Keeper, $"Public {number}");
            await AddAsync(campaignId, Keeper, $"Secret {number}", WallEntryVisibility.KeeperOnly);
        }

        var first = await ListAsync(campaignId, Player, limit: 5);
        WallEntryCursor.TryParse(first!.NextCursor, out var cursor);
        var second = await ListAsync(campaignId, Player, limit: 5, after: cursor);

        Assert.Equal(["Public 7", "Public 6", "Public 5", "Public 4", "Public 3"], first.Entries.Select(entry => entry.Text));
        Assert.NotNull(first.NextCursor);
        Assert.Equal(["Public 2", "Public 1"], second!.Entries.Select(entry => entry.Text));
        Assert.Null(second.NextCursor);
    }

    [Fact]
    public async Task Given_exactly_one_page_of_visible_entries_When_a_player_lists_Then_there_is_no_next_cursor_even_with_keeper_only_entries_behind_them()
    {
        var campaignId = await CampaignWithPlayersAsync();
        await AddAsync(campaignId, Keeper, "Secret older", WallEntryVisibility.KeeperOnly);
        await AddAsync(campaignId, Keeper, "Public 1");
        await AddAsync(campaignId, Keeper, "Public 2");

        var player = await ListAsync(campaignId, Player, limit: 2);
        var keeper = await ListAsync(campaignId, Keeper, limit: 2);

        Assert.Null(player!.NextCursor);
        Assert.NotNull(keeper!.NextCursor);
    }

    [Fact]
    public async Task Given_entries_with_the_same_time_When_paging_Then_no_entry_is_skipped_or_repeated()
    {
        var campaignId = await CampaignWithPlayersAsync();
        for (var number = 1; number <= 5; number++)
        {
            using var context = _scenario.Fixture.CreateContext();
            await CreateService(context).AddAsync(campaignId, Keeper, $"Same {number}", WallEntryVisibility.Public, CancellationToken.None);
        }

        var seen = new List<string>();
        WallEntryCursor? cursor = null;
        do
        {
            var page = await ListAsync(campaignId, Keeper, limit: 2, after: cursor);
            seen.AddRange(page!.Entries.Select(entry => entry.Text));
            WallEntryCursor.TryParse(page.NextCursor, out cursor);
        }
        while (cursor is not null);

        Assert.Equal(5, seen.Count);
        Assert.Equal(5, seen.Distinct().Count());
    }

    [Fact]
    public async Task Given_a_cursor_built_from_a_keeper_only_entry_When_a_player_pages_Then_only_older_public_entries_are_returned()
    {
        var campaignId = await CampaignWithPlayersAsync();
        await AddAsync(campaignId, Keeper, "Public old");
        var secret = (await AddAsync(campaignId, Keeper, "Secret", WallEntryVisibility.KeeperOnly)).Entry!;
        await AddAsync(campaignId, Keeper, "Public new");

        var page = await ListAsync(campaignId, Player, after: new WallEntryCursor(secret.CreatedAt, secret.Id));

        Assert.Equal(["Public old"], page!.Entries.Select(entry => entry.Text));
    }

    [Fact]
    public void Given_a_cursor_When_converted_to_a_token_and_back_Then_it_is_the_same_cursor_and_garbage_is_refused()
    {
        var cursor = new WallEntryCursor(new DateTimeOffset(2026, 10, 16, 19, 2, 3, TimeSpan.Zero), Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"));

        var parsed = WallEntryCursor.TryParse(cursor.ToToken(), out var roundTripped);

        Assert.True(parsed);
        Assert.Equal(cursor, roundTripped);
        Assert.False(WallEntryCursor.TryParse("not a cursor", out _));
        Assert.False(WallEntryCursor.TryParse("", out _));
        Assert.False(WallEntryCursor.TryParse(null, out _));
        Assert.False(WallEntryCursor.TryParse(Convert.ToBase64String("12:zzz"u8.ToArray()), out _));
    }

    private async Task<RemoveWallEntryOutcome> RemoveAsync(Guid campaignId, Guid caller, Guid entryId)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await CreateService(context).RemoveAsync(campaignId, caller, entryId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_players_entry_When_the_keeper_removes_it_Then_it_is_gone_for_everyone()
    {
        var campaignId = await CampaignWithPlayersAsync();
        var entry = (await AddAsync(campaignId, Player, "Mine.")).Entry!;

        var outcome = await RemoveAsync(campaignId, Keeper, entry.Id);

        Assert.Equal(RemoveWallEntryOutcome.Removed, outcome);
        Assert.Empty((await ListAsync(campaignId, Keeper))!.Entries);
        Assert.Empty((await ListAsync(campaignId, Player))!.Entries);
    }

    [Fact]
    public async Task Given_any_entry_or_a_missing_id_When_a_player_removes_it_Then_the_outcome_is_identical_and_nothing_is_removed()
    {
        var campaignId = await CampaignWithPlayersAsync();
        var publicEntry = (await AddAsync(campaignId, Keeper, "Public.")).Entry!;
        var secretEntry = (await AddAsync(campaignId, Keeper, "Secret.", WallEntryVisibility.KeeperOnly)).Entry!;
        var own = (await AddAsync(campaignId, Player, "Own.")).Entry!;

        var outcomes = new[]
        {
            await RemoveAsync(campaignId, Player, publicEntry.Id),
            await RemoveAsync(campaignId, Player, secretEntry.Id),
            await RemoveAsync(campaignId, Player, own.Id),
            await RemoveAsync(campaignId, Player, Guid.NewGuid()),
        };

        Assert.All(outcomes, outcome => Assert.Equal(RemoveWallEntryOutcome.NotFound, outcome));
        Assert.Equal(3, (await ListAsync(campaignId, Keeper))!.Entries.Count);
    }

    [Fact]
    public async Task Given_a_stranger_or_another_campaigns_keeper_When_removing_an_entry_Then_it_is_not_found_and_stays()
    {
        var campaignId = await CampaignWithPlayersAsync();
        var otherCampaignId = await _scenario.CreateCampaignAsync(keeperAccountId: Stranger);
        var entry = (await AddAsync(campaignId, Keeper, "Stays.")).Entry!;

        Assert.Equal(RemoveWallEntryOutcome.NotFound, await RemoveAsync(campaignId, Stranger, entry.Id));
        Assert.Equal(RemoveWallEntryOutcome.NotFound, await RemoveAsync(otherCampaignId, Stranger, entry.Id));
        Assert.Equal(RemoveWallEntryOutcome.NotFound, await RemoveAsync(campaignId, Keeper, Guid.NewGuid()));
        Assert.Single((await ListAsync(campaignId, Keeper))!.Entries);
    }
}
