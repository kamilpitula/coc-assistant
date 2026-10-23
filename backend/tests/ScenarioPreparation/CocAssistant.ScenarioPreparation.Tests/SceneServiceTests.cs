namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Listing, reading, creating, editing, removing, and reordering a Scenario's Scenes as its Keeper
/// (specs/scenario-preparation/spec.md). Everyone else, and every id from another Scenario or Campaign, gets
/// NotFound before any Scene is read or written (ADR 0013, ADR 0016).
/// </summary>
public class SceneServiceTests : IDisposable
{
    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[]}]}}";

    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly Guid Player = ScenarioPreparationTestBuilder.PlayerAccountId;
    private static readonly Guid OtherKeeper = ScenarioPreparationTestBuilder.OtherKeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<Guid> ScenarioAsync(Guid? campaignId = null, string title = "The Haunting") =>
        (await _builder.CreateScenarioAsync(campaignId ?? _builder.CampaignId, title)).Id;

    private async Task<SceneWriteResult> EditAsync(Guid campaignId, Guid caller, Guid scenarioId, Guid sceneId, string title, string? notes = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateSceneService(context).EditAsync(campaignId, caller, scenarioId, sceneId, title, null, notes, CancellationToken.None);
    }

    private async Task<SceneReorderResult> ReorderAsync(Guid campaignId, Guid caller, Guid scenarioId, params Guid[] sceneIds)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateSceneService(context).ReorderAsync(campaignId, caller, scenarioId, sceneIds, CancellationToken.None);
    }

    private async Task<(SceneRemoveOutcome Outcome, List<string> Calls)> RemoveAsync(Guid campaignId, Guid caller, Guid scenarioId, Guid sceneId)
    {
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context));
        var outcome = await _builder.CreateSceneService(context, repository).RemoveAsync(campaignId, caller, scenarioId, sceneId, CancellationToken.None);
        return (outcome, repository.Calls);
    }

    [Fact]
    public async Task Given_a_scenario_without_scenes_When_the_keeper_creates_one_Then_it_is_stored_prepared_at_position_1_and_listed()
    {
        var scenarioId = await ScenarioAsync();

        var created = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The Corbitt House", "Arkham", Notes);

        var list = await _builder.ListScenesAsync(_builder.CampaignId, scenarioId, Keeper);
        Assert.Equal([("The Corbitt House", SceneStatus.Prepared)], list!.Select(view => (view.Title, view.Status)));
        Assert.Equal(created.Id, list![0].Id);
        Assert.Null(list[0].StartedAt);
        Assert.Null(list[0].FinishedAt);
        Assert.Equal([("The Corbitt House", 1)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_two_scenes_When_the_keeper_creates_a_third_Then_it_lists_last_at_position_3()
    {
        var scenarioId = await ScenarioAsync();
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B");
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "C");

        Assert.Equal(["A", "B", "C"], (await _builder.ListScenesAsync(_builder.CampaignId, scenarioId, Keeper))!.Select(view => view.Title));
        Assert.Equal([("A", 1), ("B", 2), ("C", 3)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_scenes_in_two_scenarios_When_creating_Then_each_scenario_counts_its_own_positions()
    {
        var first = await ScenarioAsync();
        var second = await ScenarioAsync(title: "Edge of Darkness");
        await _builder.CreateSceneAsync(_builder.CampaignId, first, "A");
        await _builder.CreateSceneAsync(_builder.CampaignId, second, "Other");

        Assert.Equal([("Other", 1)], await _builder.StoredScenePositionsAsync(second));
    }

    [Fact]
    public async Task Given_scenes_with_equal_positions_When_listing_Then_created_at_then_id_make_the_order_repeatable()
    {
        var scenarioId = await ScenarioAsync();
        Scenario scenario;
        using (var context = _builder.Fixture.CreateContext())
        {
            scenario = await context.Scenarios.SingleAsync(candidate => candidate.Id == scenarioId);
        }

        var now = _builder.TimeProvider.GetUtcNow();
        var older = Scene.Create(scenario, "Older", null, null, 1, now).Scene!;
        var newer = Scene.Create(scenario, "Newer", null, null, 1, now.AddMinutes(1)).Scene!;
        var first = Scene.Create(scenario, "First", null, null, 0, now.AddMinutes(2)).Scene!;
        using (var context = _builder.Fixture.CreateContext())
        {
            context.Scenes.AddRange(newer, first, older);
            await context.SaveChangesAsync();
        }

        var one = await _builder.ListScenesAsync(_builder.CampaignId, scenarioId, Keeper);
        var two = await _builder.ListScenesAsync(_builder.CampaignId, scenarioId, Keeper);

        Assert.Equal(["First", "Older", "Newer"], one!.Select(view => view.Title));
        Assert.Equal(one!.Select(view => view.Id), two!.Select(view => view.Id));
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_gets_it_Then_the_detail_has_the_stored_fields()
    {
        var scenarioId = await ScenarioAsync();
        var created = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The Corbitt House", "Arkham", Notes);

        using var context = _builder.Fixture.CreateContext();
        var view = await _builder.CreateSceneService(context).GetAsync(_builder.CampaignId, Keeper, scenarioId, created.Id, CancellationToken.None);

        Assert.Equal(created with { NonPlayerEntityLinks = view!.NonPlayerEntityLinks, ItemLinks = view.ItemLinks, Handouts = view.Handouts }, view);
        Assert.Empty(view.NonPlayerEntityLinks);
        Assert.Equal(("Arkham", Notes), (view!.Location, view.KeeperNotes));
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_the_keeper_edits_it_Then_the_fields_change_and_the_position_stays()
    {
        var scenarioId = await ScenarioAsync();
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        var second = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B");

        var result = await EditAsync(_builder.CampaignId, Keeper, scenarioId, second.Id, "B2", Notes);

        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        Assert.Equal(("B2", Notes), (result.Scene!.Title, result.Scene.KeeperNotes));
        Assert.Equal([("A", 1), ("B2", 2)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_an_invalid_title_or_notes_When_the_keeper_edits_Then_the_matching_outcome_is_returned_and_nothing_changes()
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A", "Here");

        Assert.Equal(SceneWriteOutcome.InvalidTitle, (await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, " ")).Outcome);
        Assert.Equal(SceneWriteOutcome.InvalidKeeperNotes, (await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, "B", "{}")).Outcome);

        using var context = _builder.Fixture.CreateContext();
        var stored = await _builder.CreateSceneService(context).GetAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, CancellationToken.None);
        Assert.Equal(scene with { NonPlayerEntityLinks = stored!.NonPlayerEntityLinks, ItemLinks = stored.ItemLinks, Handouts = stored.Handouts }, stored);
    }

    [Fact]
    public async Task Given_an_active_scene_When_the_keeper_edits_it_Then_the_edit_is_saved()
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        await _builder.PlayAsync(scene.Id, SceneStatus.Active);

        var result = await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, "A2", Notes);

        Assert.Equal((SceneWriteOutcome.Saved, SceneStatus.Active), (result.Outcome, result.Scene!.Status));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_the_keeper_edits_it_even_with_invalid_fields_Then_the_outcome_is_finished_and_nothing_changes()
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        await _builder.PlayAsync(scene.Id, SceneStatus.Finished);

        Assert.Equal(SceneWriteOutcome.Finished, (await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, "A2")).Outcome);
        Assert.Equal(SceneWriteOutcome.Finished, (await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, "")).Outcome);
        Assert.Equal([("A", 1)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_the_keeper_removes_it_Then_it_is_gone()
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");

        var (outcome, _) = await RemoveAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id);

        Assert.Equal(SceneRemoveOutcome.Removed, outcome);
        Assert.Empty(await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_active_or_finished_scene_When_the_keeper_removes_it_Then_it_is_not_prepared_and_remove_is_never_called(SceneStatus status)
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        await _builder.PlayAsync(scene.Id, status);

        var (outcome, calls) = await RemoveAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id);

        Assert.Equal(SceneRemoveOutcome.NotPrepared, outcome);
        Assert.DoesNotContain(nameof(ISceneRepository.Remove), calls);
        Assert.Equal([("A", 1)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_three_scenes_When_the_keeper_reorders_them_Then_the_new_order_is_returned_and_stored_from_1()
    {
        var scenarioId = await ScenarioAsync();
        var a = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        var b = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B");
        var c = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "C");

        var result = await ReorderAsync(_builder.CampaignId, Keeper, scenarioId, c.Id, a.Id, b.Id);

        Assert.Equal(SceneReorderOutcome.Reordered, result.Outcome);
        Assert.Equal(["C", "A", "B"], result.Scenes!.Select(view => view.Title));
        Assert.Equal(["C", "A", "B"], (await _builder.ListScenesAsync(_builder.CampaignId, scenarioId, Keeper))!.Select(view => view.Title));
        Assert.Equal([("A", 2), ("B", 3), ("C", 1)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_the_keeper_reorders_Then_it_moves()
    {
        var scenarioId = await ScenarioAsync();
        var a = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        var b = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B");
        await _builder.PlayAsync(a.Id, SceneStatus.Finished);

        var result = await ReorderAsync(_builder.CampaignId, Keeper, scenarioId, b.Id, a.Id);

        Assert.Equal(SceneReorderOutcome.Reordered, result.Outcome);
        Assert.Equal([("A", 2), ("B", 1)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_duplicate_or_mismatched_ids_When_the_keeper_reorders_Then_it_is_refused_and_nothing_changes()
    {
        var scenarioId = await ScenarioAsync();
        var a = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B");

        Assert.Equal(SceneReorderOutcome.DuplicateIds, (await ReorderAsync(_builder.CampaignId, Keeper, scenarioId, a.Id, a.Id)).Outcome);
        Assert.Equal(SceneReorderOutcome.DoesNotMatchScenes, (await ReorderAsync(_builder.CampaignId, Keeper, scenarioId, a.Id)).Outcome);
        Assert.Equal(SceneReorderOutcome.DoesNotMatchScenes, (await ReorderAsync(_builder.CampaignId, Keeper, scenarioId, a.Id, Guid.NewGuid())).Outcome);
        Assert.Equal([("A", 1), ("B", 2)], await _builder.StoredScenePositionsAsync(scenarioId));
    }

    [Fact]
    public async Task Given_a_scene_id_of_another_scenario_When_reordering_Then_the_set_does_not_match()
    {
        var first = await ScenarioAsync();
        var second = await ScenarioAsync(title: "Edge of Darkness");
        var a = await _builder.CreateSceneAsync(_builder.CampaignId, first, "A");
        var foreign = await _builder.CreateSceneAsync(_builder.CampaignId, second, "Foreign");

        var result = await ReorderAsync(_builder.CampaignId, Keeper, first, a.Id, foreign.Id);

        Assert.Equal(SceneReorderOutcome.DoesNotMatchScenes, result.Outcome);
    }

    public static TheoryData<string> RefusedCallers() => ["player", "other keeper", "missing campaign"];

    [Theory]
    [MemberData(nameof(RefusedCallers))]
    public async Task Given_a_refused_caller_When_using_any_operation_Then_everything_is_not_found_and_the_repository_is_untouched(string caller)
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A");
        var (campaignId, accountId) = caller switch
        {
            "player" => (_builder.CampaignId, Player),
            "other keeper" => (_builder.CampaignId, OtherKeeper),
            _ => (Guid.NewGuid(), Keeper),
        };

        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context));
        var service = _builder.CreateSceneService(context, repository);

        Assert.Null(await service.ListAsync(campaignId, accountId, scenarioId, CancellationToken.None));
        Assert.Null(await service.GetAsync(campaignId, accountId, scenarioId, scene.Id, CancellationToken.None));
        Assert.Equal(SceneWriteOutcome.NotFound, (await service.CreateAsync(campaignId, accountId, scenarioId, "X", null, null, CancellationToken.None)).Outcome);
        Assert.Equal(SceneWriteOutcome.NotFound, (await service.EditAsync(campaignId, accountId, scenarioId, scene.Id, "X", null, null, CancellationToken.None)).Outcome);
        Assert.Equal(SceneRemoveOutcome.NotFound, await service.RemoveAsync(campaignId, accountId, scenarioId, scene.Id, CancellationToken.None));
        Assert.Equal(SceneReorderOutcome.NotFound, (await service.ReorderAsync(campaignId, accountId, scenarioId, [scene.Id], CancellationToken.None)).Outcome);
        Assert.Empty(repository.Calls);
    }

    [Fact]
    public async Task Given_a_scenario_of_another_campaign_or_a_missing_scenario_When_using_any_operation_Then_everything_is_not_found()
    {
        var foreignScenario = await ScenarioAsync(_builder.OtherCampaignOfSameKeeperId);
        var missingScenario = Guid.NewGuid();
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateSceneService(context);

        foreach (var scenarioId in new[] { foreignScenario, missingScenario })
        {
            Assert.Null(await service.ListAsync(_builder.CampaignId, Keeper, scenarioId, CancellationToken.None));
            Assert.Equal(SceneWriteOutcome.NotFound, (await service.CreateAsync(_builder.CampaignId, Keeper, scenarioId, "X", null, null, CancellationToken.None)).Outcome);
            Assert.Equal(SceneReorderOutcome.NotFound, (await service.ReorderAsync(_builder.CampaignId, Keeper, scenarioId, [], CancellationToken.None)).Outcome);
        }

        Assert.Empty(await _builder.StoredScenePositionsAsync(foreignScenario));
    }

    [Fact]
    public async Task Given_a_scene_of_another_scenario_When_getting_editing_or_removing_Then_it_is_not_found()
    {
        var first = await ScenarioAsync();
        var second = await ScenarioAsync(title: "Edge of Darkness");
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, first, "A");
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateSceneService(context);

        Assert.Null(await service.GetAsync(_builder.CampaignId, Keeper, second, scene.Id, CancellationToken.None));
        Assert.Equal(SceneWriteOutcome.NotFound, (await service.EditAsync(_builder.CampaignId, Keeper, second, scene.Id, "X", null, null, CancellationToken.None)).Outcome);
        Assert.Equal(SceneRemoveOutcome.NotFound, await service.RemoveAsync(_builder.CampaignId, Keeper, second, scene.Id, CancellationToken.None));
        Assert.Equal([("A", 1)], await _builder.StoredScenePositionsAsync(first));
    }

    [Fact]
    public async Task Given_a_scene_with_links_When_the_keeper_edits_it_Then_the_saved_scene_carries_its_links_in_the_order_linked()
    {
        var scenarioId = await ScenarioAsync();
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The Corbitt House");
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott");
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, scene.Id, NonPlayerEntityType.MythosCreature, creature.Id, "First");
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, scene.Id, NonPlayerEntityType.HumanNpc, human.Id, "Second");

        var result = await EditAsync(_builder.CampaignId, Keeper, scenarioId, scene.Id, "Renamed");

        Assert.Equal(
            [("First", "Ghoul"), ("Second", "Mr. Knott")],
            result.Scene!.NonPlayerEntityLinks.Select(link => (link.PlayerFacingName, link.NonPlayerEntity.Name)));
    }

    [Fact]
    public async Task Given_a_new_scene_When_created_Then_it_has_no_links()
    {
        var scenarioId = await ScenarioAsync();

        var created = await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The Corbitt House");

        Assert.Empty(created.NonPlayerEntityLinks);
    }
}
