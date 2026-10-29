namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// A delete or replace that races a Scene start loses to it, with the path's existing 409 outcome, and a Scene edit that races a
/// start or finish reloads once (ADR 0019, ADR 0022, ADR 0025 D6).
/// </summary>
public class LinkedMaterialRaceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_deleting_a_linked_Human_NPC_Then_the_delete_is_refused_and_the_profile_and_link_stay()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var humanNpc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, humanNpc.Id);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingHumanNpcRepository(new EfHumanNpcRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateHumanNpcService(context, racing).DeleteAsync(_builder.CampaignId, Keeper, humanNpc.Id, CancellationToken.None);

        Assert.Equal(HumanNpcDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Equal(1, await _builder.StoredHumanNpcCountAsync());
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_deleting_a_linked_Mythos_Creature_Then_the_delete_is_refused_and_the_profile_and_link_stay()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingMythosCreatureRepository(new EfMythosCreatureRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateMythosCreatureService(context, racing).DeleteAsync(_builder.CampaignId, Keeper, creature.Id, CancellationToken.None);

        Assert.Equal(MythosCreatureDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Equal(1, await _builder.StoredMythosCreatureCountAsync());
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_deleting_a_linked_Item_Then_the_delete_is_refused_and_the_Item_and_link_stay()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateItemService(context, racing).DeleteAsync(_builder.CampaignId, Keeper, item.Id, CancellationToken.None);

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Equal(1, await _builder.StoredItemCountAsync());
        Assert.Equal(1, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_removing_an_Item_Handout_Then_it_is_refused_as_in_play_and_the_Handout_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateHandoutService(context, null, racing)
            .RemoveAsync(_builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.InPlay, outcome);
        Assert.Single((await _builder.GetItemAsync(_builder.CampaignId, item.Id))!.Handouts);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_replacing_an_Item_Handout_file_Then_it_is_refused_in_play_and_the_new_blob_is_deleted()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var (handout, oldKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingItemRepository(new EfItemRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };
        var png = HandoutFileSamples.Png();

        var result = await _builder.CreateHandoutFileService(context, null, racing).EditAsync(
            _builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph",
            new HandoutUpload("new.png", png.Length, new MemoryStream(png)), CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.InPlay, result.Outcome);
        Assert.Equal([oldKey], _builder.FileStore.StoredKeys.ToList());
    }

    [Fact]
    public async Task Given_no_race_When_replacing_an_Item_Handout_file_of_an_Item_not_in_play_Then_the_replace_is_saved_and_the_old_blob_deleted()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var (handout, oldKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var png = HandoutFileSamples.Png();

        var result = await _builder.CreateHandoutFileService(context).EditAsync(
            _builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph",
            new HandoutUpload("new.png", png.Length, new MemoryStream(png)), CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.DoesNotContain(oldKey, _builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_editing_a_Scene_Then_the_edit_is_reapplied_once_on_the_Active_Scene()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        racing.BeforeSave = async () =>
        {
            racing.BeforeSave = null;
            await _builder.PlayAsync(sceneId, SceneStatus.Active);
        };

        var result = await _builder.CreateSceneService(context, racing).EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "Renamed", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        var stored = await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId);
        Assert.Equal(("Renamed", SceneStatus.Active), (stored!.Title, stored.Status));
    }

    [Fact]
    public async Task Given_a_finish_wins_the_race_When_editing_a_Scene_Then_the_edit_is_refused_as_finished_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        racing.BeforeSave = async () =>
        {
            racing.BeforeSave = null;
            await _builder.PlayAsync(sceneId, SceneStatus.Finished);
        };

        var result = await _builder.CreateSceneService(context, racing).EditAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "Renamed", null, null, CancellationToken.None);

        Assert.Equal(SceneWriteOutcome.Finished, result.Outcome);
        Assert.Equal("The Corbitt House", (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Title);
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_removing_a_Scene_Then_it_is_refused_as_not_prepared_and_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateSceneService(context, racing).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.NotPrepared, outcome);
        Assert.Equal(SceneStatus.Active, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Status);
    }

    [Fact]
    public async Task Given_a_Scene_with_a_Handout_When_the_Handout_is_removed_and_a_start_wins_the_race_Then_the_remove_is_refused_as_not_prepared()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context))
        {
            BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active),
        };

        var outcome = await _builder.CreateHandoutService(context, racing)
            .RemoveAsync(_builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.NotPrepared, outcome);
        Assert.Single((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Handouts);
    }
}
