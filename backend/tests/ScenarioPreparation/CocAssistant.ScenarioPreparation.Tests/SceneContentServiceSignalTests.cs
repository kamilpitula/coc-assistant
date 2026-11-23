namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Scenario Preparation's after-commit signal onto the Keeper-only scenes topic (ADR 0036, PBI-SPL-008): each Scene
/// content write path signals once with its Campaign id after its own successful commit, and never on a refusal,
/// a NotFound, a failed save, or a concurrency-refused outcome.
/// </summary>
public class SceneContentServiceSignalTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly Guid Player = ScenarioPreparationTestBuilder.PlayerAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private void ClearSignals() => _builder.Signals.CampaignIds.Clear();

    private void AssertSignalledOnce() => Assert.Equal([_builder.CampaignId], _builder.Signals.CampaignIds);

    private async Task<Guid> ScenarioAsync(string title = "The Haunting") =>
        (await _builder.CreateScenarioAsync(_builder.CampaignId, title)).Id;

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(string title = "The Corbitt House")
    {
        var scenarioId = await ScenarioAsync();
        return (scenarioId, (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, title)).Id);
    }

    [Fact]
    public async Task Given_a_scenario_When_the_keeper_creates_a_scene_Then_scenes_is_signalled_once()
    {
        var scenarioId = await ScenarioAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .CreateAsync(_builder.CampaignId, Keeper, scenarioId, "The Corbitt House", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_edits_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "The Corbitt Cellar", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_editing_a_scene_Then_the_reapplied_edit_signals_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        racing.BeforeSave = async () =>
        {
            racing.BeforeSave = null;
            await _builder.PlayAsync(sceneId, SceneStatus.Active);
        };

        var result = await _builder.CreateSceneService(context, racing)
            .EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "Renamed", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_two_scenes_When_the_keeper_reorders_them_Then_scenes_is_signalled_once()
    {
        var scenarioId = await ScenarioAsync();
        var first = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "A")).Id;
        var second = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "B")).Id;
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .ReorderAsync(_builder.CampaignId, Keeper, scenarioId, [second, first], CancellationToken.None);

        Assert.Equal(SceneReorderOutcome.Reordered, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_the_keeper_removes_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateSceneService(context)
            .RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.Removed, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_finished_scene_When_editing_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "Renamed", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Finished, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_an_invalid_title_When_editing_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, " ", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.InvalidTitle, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_player_When_creating_a_scene_Then_it_is_not_found_and_nothing_is_signalled()
    {
        var scenarioId = await ScenarioAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .CreateAsync(_builder.CampaignId, Player, scenarioId, "The Corbitt House", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_mismatched_order_When_reordering_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateSceneService(context)
            .ReorderAsync(_builder.CampaignId, Keeper, scenarioId, [sceneId, Guid.NewGuid()], CancellationToken.None);

        Assert.Equal(SceneReorderOutcome.DoesNotMatchScenes, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_removing_a_scene_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateSceneService(context, racing)
            .RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.NotPrepared, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    private static string Rich(string text) => ScenarioPreparationTestBuilder.RichText(text);

    private async Task<HandoutWriteResult> CreateHandoutAsync(HandoutOwnerReference owner, string title = "The cellar")
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context)
            .CreateAsync(_builder.CampaignId, Keeper, owner, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, title, Rich("The door creaks open"), CancellationToken.None);
    }

    private async Task<HandoutWriteResult> EditHandoutAsync(HandoutOwnerReference owner, Guid handoutId, string title = "Renamed")
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context)
            .EditAsync(_builder.CampaignId, Keeper, owner, handoutId, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, title, Rich("The door creaks open"), CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_creates_a_handout_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();

        var result = await CreateHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_scene_handout_When_the_keeper_edits_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        ClearSignals();

        var result = await EditHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_scene_handout_When_the_keeper_removes_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateHandoutService(context)
            .RemoveAsync(_builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_scene_handouts_When_the_keeper_reorders_them_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var first = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "First");
        var second = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Second");
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutService(context)
            .ReorderAsync(_builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), [second.Id, first.Id], CancellationToken.None);

        Assert.Equal(HandoutReorderOutcome.Reordered, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_When_the_keeper_creates_a_handout_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();

        var result = await CreateHandoutAsync(new ItemHandoutOwnerReference(item.Id));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_handout_When_the_keeper_edits_it_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        ClearSignals();

        var result = await EditHandoutAsync(new ItemHandoutOwnerReference(item.Id), handout.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_handout_When_the_keeper_removes_it_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateHandoutService(context)
            .RemoveAsync(_builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_item_handouts_When_the_keeper_reorders_them_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var first = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "First");
        var second = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "Second");
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutService(context)
            .ReorderAsync(_builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), [second.Id, first.Id], CancellationToken.None);

        Assert.Equal(HandoutReorderOutcome.Reordered, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_player_When_creating_a_handout_Then_it_is_not_found_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutService(context)
            .CreateAsync(_builder.CampaignId, Player, new SceneHandoutOwnerReference(scenarioId, sceneId), HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "The cellar", Rich("The door creaks open"), CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_removing_a_handout_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateHandoutService(context, racing)
            .RemoveAsync(_builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.NotPrepared, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_mismatched_order_When_reordering_handouts_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutService(context)
            .ReorderAsync(_builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), [handout.Id, Guid.NewGuid()], CancellationToken.None);

        Assert.Equal(HandoutReorderOutcome.DoesNotMatchHandouts, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_an_item_in_play_When_removing_its_handout_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateHandoutService(context)
            .RemoveAsync(_builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.InPlay, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    private static HandoutUpload Upload(byte[] bytes, string name = "plan.png") =>
        new(name, bytes.Length, new MemoryStream(bytes));

    private async Task<HandoutWriteResult> CreateFileHandoutAsync(HandoutOwnerReference owner, HandoutUpload? upload, ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context, repository)
            .CreateAsync(_builder.CampaignId, Keeper, owner, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", upload, null, CancellationToken.None);
    }

    private async Task<HandoutWriteResult> EditFileHandoutAsync(HandoutOwnerReference owner, Guid handoutId, HandoutUpload? upload, ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context, repository)
            .EditAsync(_builder.CampaignId, Keeper, owner, handoutId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Renamed", upload, null, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_adds_a_file_handout_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();

        var result = await CreateFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_scene_file_handout_When_the_keeper_replaces_its_file_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var created = await CreateFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), Upload(HandoutFileSamples.Png()));
        ClearSignals();

        var result = await EditFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), created.Handout!.Id, Upload(HandoutFileSamples.Png(), "new.png"));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_When_the_keeper_adds_a_file_handout_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();

        var result = await CreateFileHandoutAsync(new ItemHandoutOwnerReference(item.Id), Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_file_handout_When_the_keeper_replaces_its_file_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (handout, _) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        ClearSignals();

        var result = await EditFileHandoutAsync(new ItemHandoutOwnerReference(item.Id), handout.Id, Upload(HandoutFileSamples.Png(), "new.png"));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_store_that_fails_When_adding_a_file_handout_Then_it_is_storage_failed_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.FileStore.FailSave = true;
        ClearSignals();

        var result = await CreateFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.StorageFailed, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_replacing_a_file_Then_it_is_in_play_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var created = await CreateFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), Upload(HandoutFileSamples.Png()));
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var result = await EditFileHandoutAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), created.Handout!.Id, Upload(HandoutFileSamples.Png(), "new.png"), racing);

        Assert.Equal(HandoutWriteOutcome.InPlay, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_player_When_adding_a_file_handout_Then_it_is_not_found_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutFileService(context)
            .CreateAsync(_builder.CampaignId, Player, new SceneHandoutOwnerReference(scenarioId, sceneId), HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", Upload(HandoutFileSamples.Png()), null, CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    private async Task<NonPlayerEntityLinkWriteResult> LinkEntityAsync(Guid scenarioId, Guid sceneId, Guid entityId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateLinkService(context)
            .LinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, entityId, "A shape in the cellar", null, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_links_an_entity_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var npc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        ClearSignals();

        var result = await LinkEntityAsync(scenarioId, sceneId, npc.Id);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_link_When_the_keeper_edits_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var npc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, npc.Id);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateLinkService(context)
            .EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, link.Id, "A closer shape", null, CancellationToken.None);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_link_When_the_keeper_unlinks_it_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var npc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, npc.Id);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateLinkService(context)
            .UnlinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, link.Id, CancellationToken.None);

        Assert.Equal(NonPlayerEntityUnlinkOutcome.Unlinked, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_player_When_linking_an_entity_Then_it_is_not_found_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var npc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateLinkService(context)
            .LinkAsync(_builder.CampaignId, Player, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, npc.Id, "A shape in the cellar", null, CancellationToken.None);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_an_unknown_entity_When_linking_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        ClearSignals();

        var result = await LinkEntityAsync(scenarioId, sceneId, Guid.NewGuid());

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.NonPlayerEntityNotInCampaign, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_linking_an_entity_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var npc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);
        ClearSignals();

        var result = await LinkEntityAsync(scenarioId, sceneId, npc.Id);

        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Finished, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    private async Task<ItemLinkWriteResult> LinkItemAsync(Guid scenarioId, Guid sceneId, Guid itemId, ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemLinkService(context, repository)
            .LinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, itemId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_scene_When_the_keeper_links_an_item_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();

        var result = await LinkItemAsync(scenarioId, sceneId, item.Id);

        Assert.Equal(ItemLinkWriteOutcome.Linked, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_link_When_the_keeper_unlinks_the_item_Then_scenes_is_signalled_once()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var outcome = await _builder.CreateItemLinkService(context)
            .UnlinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, link.Id, CancellationToken.None);

        Assert.Equal(ItemUnlinkOutcome.Unlinked, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_already_linked_When_linking_it_again_Then_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await LinkItemAsync(scenarioId, sceneId, item.Id);
        ClearSignals();

        var result = await LinkItemAsync(scenarioId, sceneId, item.Id);

        Assert.Equal(ItemLinkWriteOutcome.AlreadyLinked, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_second_tab_links_the_item_first_When_linking_Then_it_is_already_linked_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        ItemLinkView? winner = null;
        racing.BeforeSave = async () => winner = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);

        var result = await LinkItemAsync(scenarioId, sceneId, item.Id, racing);

        Assert.Equal(ItemLinkWriteOutcome.AlreadyLinked, result.Outcome);
        Assert.NotNull(winner);
        Assert.Equal((winner.Id, winner.Item.Id), (result.Link!.Id, result.Link.Item.Id));
        // Only the winning request signalled; the lost race added nothing.
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_a_finished_scene_When_linking_an_item_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);
        ClearSignals();

        var result = await LinkItemAsync(scenarioId, sceneId, item.Id);

        Assert.Equal(ItemLinkWriteOutcome.Finished, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_player_When_linking_an_item_Then_it_is_not_found_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemLinkService(context)
            .LinkAsync(_builder.CampaignId, Player, scenarioId, sceneId, item.Id, CancellationToken.None);

        Assert.Equal(ItemLinkWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    private static string ItemDescription(string text) => ScenarioPreparationTestBuilder.RichText(text);

    private async Task<ItemWriteResult> EditItemAsync(Guid itemId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemService(context)
            .EditAsync(_builder.CampaignId, Keeper, itemId, "The cellar key", ItemDescription("A leather diary"), null, CancellationToken.None);
    }

    private async Task<ItemDeleteOutcome> DeleteItemAsync(Guid itemId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemService(context)
            .DeleteAsync(_builder.CampaignId, Keeper, itemId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_an_item_When_the_keeper_edits_it_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();

        var result = await EditItemAsync(item.Id);

        Assert.Equal(ItemWriteOutcome.Saved, result.Outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_an_item_When_the_keeper_deletes_it_Then_scenes_is_signalled_once()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        ClearSignals();

        var outcome = await DeleteItemAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Deleted, outcome);
        AssertSignalledOnce();
    }

    [Fact]
    public async Task Given_no_links_When_the_keeper_creates_an_item_Then_nothing_is_signalled()
    {
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context)
            .CreateAsync(_builder.CampaignId, Keeper, "Walter Corbitt's diary", ItemDescription("A leather diary"), null, CancellationToken.None);

        Assert.Equal(ItemWriteOutcome.Saved, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_held_item_When_deleting_Then_it_is_refused_as_held_and_nothing_is_signalled()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.HoldItemAsync(item.Id, Guid.NewGuid());
        ClearSignals();

        var outcome = await DeleteItemAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Held, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_an_item_linked_to_a_played_scene_When_deleting_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);
        ClearSignals();

        var outcome = await DeleteItemAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_deleting_a_linked_item_Then_it_is_refused_and_nothing_is_signalled()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        ClearSignals();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateItemService(context, racing)
            .DeleteAsync(_builder.CampaignId, Keeper, item.Id, CancellationToken.None);

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }
}
