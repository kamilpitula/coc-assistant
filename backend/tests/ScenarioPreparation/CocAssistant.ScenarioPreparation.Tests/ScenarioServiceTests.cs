namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Listing, reading, creating, editing, and reordering a Campaign's Scenarios as its Keeper (specs/scenario-preparation/spec.md).
/// Everyone else, and every id from another Campaign, gets NotFound before any Scenario is read or written (ADR 0013).
/// </summary>
public class ScenarioServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly Guid Player = ScenarioPreparationTestBuilder.PlayerAccountId;
    private static readonly Guid OtherKeeper = ScenarioPreparationTestBuilder.OtherKeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<ScenarioWriteResult> EditAsync(Guid campaignId, Guid caller, Guid scenarioId, string title, string? notes)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateService(context).EditAsync(campaignId, caller, scenarioId, title, notes, CancellationToken.None);
    }

    private async Task<ScenarioReorderResult> ReorderAsync(Guid campaignId, Guid caller, params Guid[] scenarioIds)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateService(context).ReorderAsync(campaignId, caller, scenarioIds, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_campaign_without_scenarios_When_the_keeper_creates_one_Then_it_is_stored_at_position_1_and_listed()
    {
        var created = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting", "Cellar key.");

        var list = await _builder.ListAsync(_builder.CampaignId, Keeper);

        Assert.Equal([("The Haunting", "Cellar key.")], list!.Select(view => (view.Title, view.KeeperNotes)));
        Assert.Equal(created.Id, list![0].Id);
        Assert.Equal([("The Haunting", 1)], await _builder.StoredPositionsAsync(_builder.CampaignId));
    }

    [Fact]
    public async Task Given_two_scenarios_When_the_keeper_creates_a_third_Then_it_follows_at_position_3_and_lists_last()
    {
        await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        await _builder.CreateScenarioAsync(_builder.CampaignId, "B");
        await _builder.CreateScenarioAsync(_builder.CampaignId, "C");

        Assert.Equal(["A", "B", "C"], (await _builder.ListAsync(_builder.CampaignId, Keeper))!.Select(view => view.Title));
        Assert.Equal([("A", 1), ("B", 2), ("C", 3)], await _builder.StoredPositionsAsync(_builder.CampaignId));
    }

    [Fact]
    public async Task Given_scenarios_in_two_campaigns_When_creating_Then_each_campaign_counts_its_own_positions()
    {
        await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        await _builder.CreateScenarioAsync(_builder.OtherCampaignOfSameKeeperId, "Other");

        Assert.Equal([("Other", 1)], await _builder.StoredPositionsAsync(_builder.OtherCampaignOfSameKeeperId));
    }

    [Fact]
    public async Task Given_scenarios_with_equal_positions_When_listing_Then_created_at_breaks_the_tie_and_reads_are_repeatable()
    {
        var older = Scenario.Create(_builder.CampaignId, "Older", null, 1, _builder.TimeProvider.GetUtcNow()).Scenario!;
        var newer = Scenario.Create(_builder.CampaignId, "Newer", null, 1, _builder.TimeProvider.GetUtcNow().AddMinutes(1)).Scenario!;
        var third = Scenario.Create(_builder.CampaignId, "Third", null, 0, _builder.TimeProvider.GetUtcNow().AddMinutes(2)).Scenario!;
        using (var context = _builder.Fixture.CreateContext())
        {
            context.Scenarios.AddRange(newer, third, older);
            await context.SaveChangesAsync();
        }

        var first = await _builder.ListAsync(_builder.CampaignId, Keeper);
        var second = await _builder.ListAsync(_builder.CampaignId, Keeper);

        Assert.Equal(["Third", "Older", "Newer"], first!.Select(view => view.Title));
        Assert.Equal(first!.Select(view => view.Id), second!.Select(view => view.Id));
    }

    [Fact]
    public async Task Given_scenarios_with_equal_positions_and_created_at_When_listing_Then_the_id_makes_the_order_repeatable()
    {
        var now = _builder.TimeProvider.GetUtcNow();
        using (var context = _builder.Fixture.CreateContext())
        {
            context.Scenarios.AddRange(
                Enumerable.Range(1, 4).Select(number => Scenario.Create(_builder.CampaignId, $"S{number}", null, 1, now).Scenario!));
            await context.SaveChangesAsync();
        }

        var reads = new List<IEnumerable<Guid>>();
        for (var read = 0; read < 3; read++)
        {
            reads.Add((await _builder.ListAsync(_builder.CampaignId, Keeper))!.Select(view => view.Id).ToList());
        }

        Assert.All(reads, ids => Assert.Equal(reads[0], ids));
    }

    [Fact]
    public async Task Given_a_scenario_When_the_keeper_gets_it_Then_the_view_has_the_stored_fields()
    {
        var created = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting", "Notes");

        using var context = _builder.Fixture.CreateContext();
        var view = await _builder.CreateService(context).GetAsync(_builder.CampaignId, Keeper, created.Id, CancellationToken.None);

        Assert.Equal(created, view);
    }

    [Fact]
    public async Task Given_a_scenario_When_the_keeper_edits_it_Then_title_and_notes_persist_and_the_next_read_returns_them()
    {
        var created = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting", "old");

        var result = await EditAsync(_builder.CampaignId, Keeper, created.Id, "  Edge of Darkness ", "new");

        Assert.Equal(ScenarioWriteOutcome.Saved, result.Outcome);
        var list = await _builder.ListAsync(_builder.CampaignId, Keeper);
        Assert.Equal([(created.Id, "Edge of Darkness", "new")], list!.Select(view => (view.Id, view.Title, view.KeeperNotes)));
    }

    [Theory]
    [InlineData("   ", "notes", ScenarioWriteOutcome.InvalidTitle)]
    [InlineData("Title", "", ScenarioWriteOutcome.Saved)]
    public async Task Given_a_scenario_When_editing_Then_invalid_fields_are_reported_by_field(string title, string notes, ScenarioWriteOutcome expected)
    {
        var created = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting", "old");

        var result = await EditAsync(_builder.CampaignId, Keeper, created.Id, title, notes);

        Assert.Equal(expected, result.Outcome);
    }

    [Fact]
    public async Task Given_a_refused_create_or_edit_When_notes_are_too_long_Then_nothing_is_stored_or_changed()
    {
        var created = await _builder.CreateScenarioAsync(_builder.CampaignId, "Keep", "old");
        using var createContext = _builder.Fixture.CreateContext();
        var refusedCreate = await _builder.CreateService(createContext)
            .CreateAsync(_builder.CampaignId, Keeper, "New", new string('n', 10_001), CancellationToken.None);

        var refusedEdit = await EditAsync(_builder.CampaignId, Keeper, created.Id, "Changed", new string('n', 10_001));

        Assert.Equal([ScenarioWriteOutcome.InvalidKeeperNotes, ScenarioWriteOutcome.InvalidKeeperNotes], [refusedCreate.Outcome, refusedEdit.Outcome]);
        var list = await _builder.ListAsync(_builder.CampaignId, Keeper);
        Assert.Equal([("Keep", "old")], list!.Select(view => (view.Title, view.KeeperNotes)));
    }

    [Fact]
    public async Task Given_a_reorder_When_the_keeper_requests_a_new_order_Then_it_is_persisted_and_returned_and_the_next_list_matches()
    {
        var a = await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        var b = await _builder.CreateScenarioAsync(_builder.CampaignId, "B");
        var c = await _builder.CreateScenarioAsync(_builder.CampaignId, "C");

        var result = await ReorderAsync(_builder.CampaignId, Keeper, c.Id, a.Id, b.Id);

        Assert.Equal(ScenarioReorderOutcome.Reordered, result.Outcome);
        Assert.Equal(["C", "A", "B"], result.Scenarios!.Select(view => view.Title));
        Assert.Equal(["C", "A", "B"], (await _builder.ListAsync(_builder.CampaignId, Keeper))!.Select(view => view.Title));
        Assert.Equal([("A", 2), ("B", 3), ("C", 1)], await _builder.StoredPositionsAsync(_builder.CampaignId));
    }

    [Fact]
    public async Task Given_a_reorder_When_a_scenario_is_edited_afterwards_Then_it_keeps_its_place()
    {
        var a = await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        var b = await _builder.CreateScenarioAsync(_builder.CampaignId, "B");
        await ReorderAsync(_builder.CampaignId, Keeper, b.Id, a.Id);

        await EditAsync(_builder.CampaignId, Keeper, a.Id, "A edited", "notes");

        Assert.Equal(["B", "A edited"], (await _builder.ListAsync(_builder.CampaignId, Keeper))!.Select(view => view.Title));
    }

    [Fact]
    public async Task Given_a_reorder_When_the_keeper_creates_a_scenario_afterwards_Then_it_is_appended_at_n_plus_1()
    {
        var a = await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        var b = await _builder.CreateScenarioAsync(_builder.CampaignId, "B");
        await ReorderAsync(_builder.CampaignId, Keeper, b.Id, a.Id);

        await _builder.CreateScenarioAsync(_builder.CampaignId, "C");

        Assert.Equal(["B", "A", "C"], (await _builder.ListAsync(_builder.CampaignId, Keeper))!.Select(view => view.Title));
        Assert.Equal([("A", 2), ("B", 1), ("C", 3)], await _builder.StoredPositionsAsync(_builder.CampaignId));
    }

    [Fact]
    public async Task Given_a_reorder_that_is_stale_or_has_duplicates_When_applied_Then_it_is_refused_and_the_stored_order_is_unchanged()
    {
        var a = await _builder.CreateScenarioAsync(_builder.CampaignId, "A");
        var b = await _builder.CreateScenarioAsync(_builder.CampaignId, "B");
        var foreign = await _builder.CreateScenarioAsync(_builder.OtherCampaignOfSameKeeperId, "Foreign");

        var missing = await ReorderAsync(_builder.CampaignId, Keeper, b.Id);
        var extra = await ReorderAsync(_builder.CampaignId, Keeper, b.Id, a.Id, Guid.NewGuid());
        var otherCampaignsId = await ReorderAsync(_builder.CampaignId, Keeper, b.Id, foreign.Id);
        var duplicates = await ReorderAsync(_builder.CampaignId, Keeper, b.Id, b.Id);

        Assert.Equal(
            [ScenarioReorderOutcome.DoesNotMatchScenarios, ScenarioReorderOutcome.DoesNotMatchScenarios, ScenarioReorderOutcome.DoesNotMatchScenarios, ScenarioReorderOutcome.DuplicateIds],
            [missing.Outcome, extra.Outcome, otherCampaignsId.Outcome, duplicates.Outcome]);
        Assert.Equal([("A", 1), ("B", 2)], await _builder.StoredPositionsAsync(_builder.CampaignId));
        Assert.Equal([("Foreign", 1)], await _builder.StoredPositionsAsync(_builder.OtherCampaignOfSameKeeperId));
    }

    [Fact]
    public async Task Given_a_campaign_without_scenarios_When_reordering_with_an_empty_list_Then_it_is_a_no_op_success()
    {
        var result = await ReorderAsync(_builder.CampaignId, Keeper);

        Assert.Equal(ScenarioReorderOutcome.Reordered, result.Outcome);
        Assert.Empty(result.Scenarios!);
    }

    [Fact]
    public async Task Given_a_scenario_of_another_campaign_When_getting_or_editing_it_through_this_campaign_Then_it_is_not_found()
    {
        var foreign = await _builder.CreateScenarioAsync(_builder.OtherCampaignOfSameKeeperId, "Foreign");

        using var context = _builder.Fixture.CreateContext();
        var get = await _builder.CreateService(context).GetAsync(_builder.CampaignId, Keeper, foreign.Id, CancellationToken.None);
        var edit = await EditAsync(_builder.CampaignId, Keeper, foreign.Id, "Changed", null);
        var unknown = await EditAsync(_builder.CampaignId, Keeper, Guid.NewGuid(), "Changed", null);

        Assert.Null(get);
        Assert.Equal([ScenarioWriteOutcome.NotFound, ScenarioWriteOutcome.NotFound], [edit.Outcome, unknown.Outcome]);
        Assert.Equal([("Foreign", 1)], await _builder.StoredPositionsAsync(_builder.OtherCampaignOfSameKeeperId));
        Assert.Equal("Foreign", (await _builder.ListAsync(_builder.OtherCampaignOfSameKeeperId, Keeper))![0].Title);
    }

    public static TheoryData<string> NonKeeperCallers => new() { "player", "other-keeper", "stranger" };

    [Theory]
    [MemberData(nameof(NonKeeperCallers))]
    public async Task Given_a_non_keeper_When_using_any_operation_Then_it_is_not_found_and_no_scenario_data_is_touched(string who)
    {
        var existing = await _builder.CreateScenarioAsync(_builder.CampaignId, "Secret plot", "Secret notes");
        var caller = who switch
        {
            "player" => Player,
            "other-keeper" => OtherKeeper,
            _ => Guid.NewGuid(),
        };
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingScenarioRepository(new EfScenarioRepository(context));
        var service = _builder.CreateService(context, recording);
        var campaignId = _builder.CampaignId;

        var list = await service.ListAsync(campaignId, caller, CancellationToken.None);
        var get = await service.GetAsync(campaignId, caller, existing.Id, CancellationToken.None);
        var create = await service.CreateAsync(campaignId, caller, "Mine", null, CancellationToken.None);
        var edit = await service.EditAsync(campaignId, caller, existing.Id, "Mine", null, CancellationToken.None);
        var reorder = await service.ReorderAsync(campaignId, caller, [existing.Id], CancellationToken.None);

        Assert.Null(list);
        Assert.Null(get);
        Assert.Equal(ScenarioWriteOutcome.NotFound, create.Outcome);
        Assert.Equal(ScenarioWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(ScenarioReorderOutcome.NotFound, reorder.Outcome);
        Assert.Empty(recording.Calls);
        Assert.Equal([("Secret plot", 1)], await _builder.StoredPositionsAsync(campaignId));
    }

    [Fact]
    public async Task Given_a_missing_campaign_When_using_any_operation_Then_it_is_not_found()
    {
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateService(context);
        var missing = Guid.NewGuid();

        Assert.Null(await service.ListAsync(missing, Keeper, CancellationToken.None));
        Assert.Equal(ScenarioWriteOutcome.NotFound, (await service.CreateAsync(missing, Keeper, "T", null, CancellationToken.None)).Outcome);
    }
}
