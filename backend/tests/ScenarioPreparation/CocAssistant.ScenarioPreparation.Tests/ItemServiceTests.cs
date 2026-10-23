namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Listing, reading, creating, editing, and deleting a Campaign's Items as its Keeper (PBI-SP-008, specs/scenario-preparation/spec.md).
/// Everyone else ends in NotFound before any Item, usage, or holder is read (ADR 0013).
/// </summary>
public class ItemServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly string Description = ScenarioPreparationTestBuilder.RichText("A leather diary");
    private static readonly string Notes = ScenarioPreparationTestBuilder.RichText("The last page is torn out");
    private static readonly string Image = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(string scenarioTitle = "The Haunting", string sceneTitle = "The Corbitt House")
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, scenarioTitle);
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, sceneTitle)).Id);
    }

    private async Task<ItemDeleteOutcome> DeleteAsync(Guid itemId, IItemRepository? repository = null, IItemUsage? usage = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemService(context, repository, usage).DeleteAsync(_builder.CampaignId, Keeper, itemId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_the_Keeper_When_creating_an_Item_Then_the_trimmed_Item_is_stored_and_the_view_has_no_holder_Handouts_or_Scenes()
    {
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context).CreateAsync(_builder.CampaignId, Keeper, "  Walter Corbitt's diary ", Description, Notes, CancellationToken.None);

        Assert.Equal(ItemWriteOutcome.Saved, result.Outcome);
        var item = result.Item!;
        Assert.Equal(("Walter Corbitt's diary", Description, Notes, null), (item.Name, item.PlayerFacingDescription, item.KeeperNotes, item.Holder));
        Assert.Empty(item.Handouts);
        Assert.Empty(item.Scenes);
        Assert.Equal(Fields(item), Fields(await _builder.GetItemAsync(_builder.CampaignId, item.Id)));
    }

    [Theory]
    [InlineData("", "ok", ItemWriteOutcome.InvalidName)]
    [InlineData("Key", null, ItemWriteOutcome.MissingDescription)]
    [InlineData("Key", "image", ItemWriteOutcome.InvalidDescription)]
    public async Task Given_invalid_fields_When_creating_Then_the_matching_outcome_is_returned_and_nothing_is_stored(string name, string? description, ItemWriteOutcome expected)
    {
        var text = description switch
        {
            "ok" => Description,
            "image" => Image,
            _ => description,
        };
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context).CreateAsync(_builder.CampaignId, Keeper, name, text, null, CancellationToken.None);

        Assert.Equal((expected, null), (result.Outcome, result.Item));
        Assert.Equal(0, await _builder.StoredItemCountAsync());
    }

    [Fact]
    public async Task Given_invalid_Keeper_notes_When_creating_Then_the_notes_are_invalid_and_nothing_is_stored()
    {
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context).CreateAsync(_builder.CampaignId, Keeper, "Key", Description, Image, CancellationToken.None);

        Assert.Equal(ItemWriteOutcome.InvalidKeeperNotes, result.Outcome);
        Assert.Equal(0, await _builder.StoredItemCountAsync());
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_Items_Then_everything_is_NotFound_before_any_Item_usage_or_holder_is_read(string caller)
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingItemRepository(new EfItemRepository(context));
        var usage = new RecordingItemUsage(new EfItemUsage(context));
        var service = _builder.CreateItemService(context, repository, usage);

        var got = await service.GetAsync(campaignId, accountId, item.Id, CancellationToken.None);
        var listed = await service.ListAsync(campaignId, accountId, CancellationToken.None);
        var created = await service.CreateAsync(campaignId, accountId, "X", Description, null, CancellationToken.None);
        var edited = await service.EditAsync(campaignId, accountId, item.Id, "X", Description, null, CancellationToken.None);
        var deleted = await service.DeleteAsync(campaignId, accountId, item.Id, CancellationToken.None);

        Assert.Null(got);
        Assert.Null(listed);
        Assert.Equal(ItemWriteOutcome.NotFound, created.Outcome);
        Assert.Equal(ItemWriteOutcome.NotFound, edited.Outcome);
        Assert.Equal(ItemDeleteOutcome.NotFound, deleted);
        Assert.Empty(repository.Calls);
        Assert.Empty(usage.Calls);
        Assert.Empty(_builder.ItemHolders.Calls);
        Assert.Equal(1, await _builder.StoredItemCountAsync());
    }

    [Fact]
    public async Task Given_an_Item_of_another_Campaign_or_an_unknown_id_When_using_it_Then_everything_is_NotFound()
    {
        var foreign = await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateItemService(context);

        var got = await service.GetAsync(_builder.CampaignId, Keeper, foreign.Id, CancellationToken.None);
        var edited = await service.EditAsync(_builder.CampaignId, Keeper, foreign.Id, "X", Description, null, CancellationToken.None);
        var deleted = await service.DeleteAsync(_builder.CampaignId, Keeper, foreign.Id, CancellationToken.None);
        var unknown = await service.GetAsync(_builder.CampaignId, Keeper, Guid.NewGuid(), CancellationToken.None);

        Assert.Null(got);
        Assert.Null(unknown);
        Assert.Equal(ItemWriteOutcome.NotFound, edited.Outcome);
        Assert.Equal(ItemDeleteOutcome.NotFound, deleted);
        Assert.Equal("Walter Corbitt's diary", (await _builder.GetItemAsync(_builder.OtherCampaignOfSameKeeperId, foreign.Id))!.Name);
    }

    [Fact]
    public async Task Given_the_Campaign_has_Items_When_listing_Then_they_are_ordered_by_name_with_their_Scene_counts_and_other_Campaigns_are_left_out()
    {
        var (scenarioId, firstScene) = await SceneAsync();
        var secondScene = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The attic")).Id;
        var diary = await _builder.CreateItemAsync(_builder.CampaignId, "Walter Corbitt's diary");
        var key = await _builder.CreateItemAsync(_builder.CampaignId, "The cellar key");
        await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId, "Another Campaign's Item");
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, firstScene, diary.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, secondScene, diary.Id);
        using var context = _builder.Fixture.CreateContext();

        var items = await _builder.CreateItemService(context).ListAsync(_builder.CampaignId, Keeper, CancellationToken.None);

        Assert.Equal(
            [new ItemSummary(key.Id, "The cellar key", 0), new ItemSummary(diary.Id, "Walter Corbitt's diary", 2)],
            items);
    }

    [Fact]
    public async Task Given_an_Item_with_Handouts_and_links_When_getting_it_Then_the_view_lists_Handouts_in_order_and_Scenes_in_Scenario_then_Scene_order()
    {
        var (laterScenario, laterScene) = await SceneAsync("Second Scenario", "Later scene");
        var (earlierScenario, earlierSceneB) = await SceneAsync("First Scenario", "B scene");
        var earlierSceneA = (await _builder.CreateSceneAsync(_builder.CampaignId, earlierScenario, "A scene")).Id;
        await ReorderScenariosAsync(earlierScenario, laterScenario);
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, laterScenario, laterScene, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, earlierScenario, earlierSceneB, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, earlierScenario, earlierSceneA, item.Id);
        var first = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "First");
        var second = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "Second");

        var view = await _builder.GetItemAsync(_builder.CampaignId, item.Id);

        Assert.Equal(["First", "Second"], view!.Handouts.Select(handout => handout.Title));
        Assert.Equal([first.Id, second.Id], view.Handouts.Select(handout => handout.Id));
        Assert.Equal(
            [("First Scenario", "B scene"), ("First Scenario", "A scene"), ("Second Scenario", "Later scene")],
            view.Scenes.Select(scene => (scene.ScenarioTitle, scene.SceneTitle)));
        Assert.All(view.Scenes, scene => Assert.Equal(SceneStatus.Prepared, scene.Status));
    }

    [Fact]
    public async Task Given_an_Item_When_editing_Then_the_fields_are_replaced_whatever_the_status_of_the_linked_Scenes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context).EditAsync(_builder.CampaignId, Keeper, item.Id, "  The cellar key ", Notes, null, CancellationToken.None);

        Assert.Equal(ItemWriteOutcome.Saved, result.Outcome);
        Assert.Equal(("The cellar key", Notes, null), (result.Item!.Name, result.Item.PlayerFacingDescription, result.Item.KeeperNotes));
        Assert.Equal(SceneStatus.Finished, Assert.Single(result.Item.Scenes).Status);
        Assert.Equal(Fields(result.Item), Fields(await _builder.GetItemAsync(_builder.CampaignId, item.Id)));
    }

    [Fact]
    public async Task Given_a_refused_edit_When_editing_Then_the_outcome_is_returned_and_the_Item_is_unchanged()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateItemService(context).EditAsync(_builder.CampaignId, Keeper, item.Id, "Renamed", null, null, CancellationToken.None);

        Assert.Equal(ItemWriteOutcome.MissingDescription, result.Outcome);
        Assert.Equal(Fields(item), Fields(await _builder.GetItemAsync(_builder.CampaignId, item.Id)));
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_with_Handouts_When_deleting_Then_the_Item_its_links_and_Handouts_are_gone_and_the_Scene_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        var outcome = await DeleteAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Deleted, outcome);
        Assert.Equal(0, await _builder.StoredItemCountAsync());
        Assert.Equal(0, await _builder.StoredItemLinkCountAsync());
        using var context = _builder.Fixture.CreateContext();
        Assert.Equal(0, await context.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Handouts").SingleAsync());
        Assert.Empty((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.ItemLinks);
    }

    [Fact]
    public async Task Given_an_Item_with_file_Handouts_When_deleting_Then_every_file_is_deleted_after_the_commit()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (_, firstKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        var (_, secondKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id, "Another");
        await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        var outcome = await DeleteAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Deleted, outcome);
        Assert.Equal(new[] { firstKey, secondKey }.Order(), _builder.FileStore.DeletedKeys.Order());
        Assert.Empty(_builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_failing_commit_When_deleting_an_Item_with_files_Then_the_failure_propagates_and_no_file_is_deleted()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (_, key) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingItemRepository(new EfItemRepository(context)) { FailSave = true };

        await Assert.ThrowsAsync<InvalidOperationException>(() => DeleteAsync(item.Id, repository));

        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Contains(key, _builder.FileStore.StoredKeys);
        Assert.Equal(1, await _builder.StoredItemCountAsync());
    }

    [Fact]
    public async Task Given_a_failing_file_delete_When_deleting_an_Item_Then_it_is_still_deleted_and_the_key_is_logged_as_a_warning()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (_, key) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        _builder.FileStore.FailDelete = true;

        var outcome = await DeleteAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Deleted, outcome);
        var entry = Assert.Single(_builder.ItemLogger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains(key, entry.Message);
        Assert.Equal(0, await _builder.StoredItemCountAsync());
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_a_played_Scene_When_deleting_Then_it_is_refused_and_nothing_is_deleted_or_asked_of_the_holder(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        await _builder.PlayAsync(sceneId, status);
        _builder.ItemHolders.Calls.Clear();

        var outcome = await DeleteAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Equal(1, await _builder.StoredItemCountAsync());
        Assert.Equal(1, await _builder.StoredItemLinkCountAsync());
        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Empty(_builder.ItemHolders.Calls);
    }

    [Fact]
    public async Task Given_an_Item_linked_to_a_Prepared_and_an_Active_Scene_When_deleting_Then_it_is_refused()
    {
        var (scenarioId, preparedScene) = await SceneAsync();
        var activeScene = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "Second")).Id;
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, preparedScene, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, activeScene, item.Id);
        await _builder.PlayAsync(activeScene, SceneStatus.Active);

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, await DeleteAsync(item.Id));
    }

    [Fact]
    public async Task Given_a_held_Item_When_deleting_Then_it_is_refused_as_held_and_unchanged()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        _builder.ItemHolders.Hold(item.Id, Guid.NewGuid());

        var outcome = await DeleteAsync(item.Id);

        Assert.Equal(ItemDeleteOutcome.Held, outcome);
        Assert.Equal((_builder.CampaignId, item.Id), Assert.Single(_builder.ItemHolders.Calls));
        Assert.Equal(Fields(item), Fields(await _builder.GetItemAsync(_builder.CampaignId, item.Id)));
    }

    [Fact]
    public async Task Given_an_Item_both_played_and_held_When_deleting_Then_the_played_Scene_is_reported_first()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);
        _builder.ItemHolders.Hold(item.Id, Guid.NewGuid());

        Assert.Equal(ItemDeleteOutcome.LinkedToPlayedScene, await DeleteAsync(item.Id));
    }

    [Fact]
    public async Task Given_a_held_Item_When_getting_it_Then_the_holder_is_read_through_the_port()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var investigatorId = Guid.NewGuid();
        _builder.ItemHolders.Hold(item.Id, investigatorId);

        var view = await _builder.GetItemAsync(_builder.CampaignId, item.Id);

        Assert.Equal(new ItemHolder(investigatorId), view!.Holder);
    }

    private static (Guid?, string?, string?, string?) Fields(ItemView? view) => (view?.Id, view?.Name, view?.PlayerFacingDescription, view?.KeeperNotes);

    private async Task ReorderScenariosAsync(params Guid[] scenarioIds)
    {
        using var context = _builder.Fixture.CreateContext();
        var result = await _builder.CreateService(context).ReorderAsync(_builder.CampaignId, Keeper, scenarioIds, CancellationToken.None);
        Assert.Equal(ScenarioReorderOutcome.Reordered, result.Outcome);
    }
}
