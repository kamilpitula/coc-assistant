namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The shared Handout services with an Item as the owner (PBI-SP-008 D3, D5): an Item and its Handouts stay editable whatever the
/// status of the Scenes that link it, deleting a Handout and deleting a replaced file wait until the Item is not in play, and
/// a stored file is deleted only after a successful commit (ADR 0021, ADR 0022).
/// </summary>
public class ItemHandoutServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly string Text = ScenarioPreparationTestBuilder.RichText("The last entry");

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private static HandoutUpload Upload(byte[] bytes, string name = "photo.png") => new(name, bytes.Length, new MemoryStream(bytes));

    private async Task<Guid> PlayedItemAsync(SceneStatus status)
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House");
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenario.Id, scene.Id, item.Id);
        await _builder.PlayAsync(scene.Id, status);
        return item.Id;
    }

    private async Task<HandoutRemoveOutcome> RemoveAsync(Guid itemId, Guid handoutId, IItemRepository? items = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutService(context, items: items).RemoveAsync(_builder.CampaignId, Keeper, new ItemHandoutOwnerReference(itemId), handoutId, CancellationToken.None);
    }

    private async Task<HandoutWriteResult> ReplaceImageAsync(Guid itemId, Guid handoutId, IItemRepository? items = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context, items: items).EditAsync(
            _builder.CampaignId, Keeper, new ItemHandoutOwnerReference(itemId), handoutId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph",
            Upload(HandoutFileSamples.Jpeg(), "new.jpg"), CancellationToken.None);
    }

    private async Task<IReadOnlyList<HandoutSummaryView>> StoredHandoutsAsync(Guid itemId) =>
        (await _builder.GetItemAsync(_builder.CampaignId, itemId))!.Handouts;

    [Fact]
    public async Task Given_the_Keeper_When_adding_getting_editing_and_reordering_Item_Handouts_Then_the_Items_own_list_changes()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var owner = new ItemHandoutOwnerReference(item.Id);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateHandoutService(context);

        var first = await service.CreateAsync(_builder.CampaignId, Keeper, owner, HandoutKind.Text, HandoutVisibility.PlayerFacing, " The last entry ", Text, CancellationToken.None);
        var second = await service.CreateAsync(_builder.CampaignId, Keeper, owner, HandoutKind.ReadAloud, HandoutVisibility.KeeperFacing, "Second", Text, CancellationToken.None);
        var edited = await service.EditAsync(_builder.CampaignId, Keeper, owner, first.Handout!.Id, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "Renamed", Text, CancellationToken.None);
        var reordered = await service.ReorderAsync(_builder.CampaignId, Keeper, owner, [second.Handout!.Id, first.Handout.Id], CancellationToken.None);
        var got = await service.GetAsync(_builder.CampaignId, Keeper, owner, first.Handout.Id, CancellationToken.None);

        Assert.Equal([HandoutWriteOutcome.Saved, HandoutWriteOutcome.Saved, HandoutWriteOutcome.Saved], [first.Outcome, second.Outcome, edited.Outcome]);
        Assert.Equal("The last entry", first.Handout.Title);
        Assert.Equal(HandoutReorderOutcome.Reordered, reordered.Outcome);
        Assert.Equal(["Second", "Renamed"], reordered.Handouts!.Select(handout => handout.Title));
        Assert.Equal(("Renamed", HandoutKind.ReadAloud, Text), (got!.Title, got.Kind, got.Content));
        Assert.Equal(["Second", "Renamed"], (await StoredHandoutsAsync(item.Id)).Select(handout => handout.Title));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_a_played_Scene_When_adding_editing_and_reordering_Handouts_Then_it_stays_editable(SceneStatus status)
    {
        var itemId = await PlayedItemAsync(status);
        var existing = await _builder.AddItemHandoutAsync(_builder.CampaignId, itemId, "Existing");
        var owner = new ItemHandoutOwnerReference(itemId);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateHandoutService(context);

        var added = await service.CreateAsync(_builder.CampaignId, Keeper, owner, HandoutKind.Text, HandoutVisibility.PlayerFacing, "Added", Text, CancellationToken.None);
        var edited = await service.EditAsync(_builder.CampaignId, Keeper, owner, existing.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Edited", Text, CancellationToken.None);
        var reordered = await service.ReorderAsync(_builder.CampaignId, Keeper, owner, [added.Handout!.Id, existing.Id], CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.Saved, added.Outcome);
        Assert.Equal(HandoutWriteOutcome.Saved, edited.Outcome);
        Assert.Equal(HandoutReorderOutcome.Reordered, reordered.Outcome);
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_Item_Handouts_Then_everything_is_NotFound_before_any_Item_is_read(string caller)
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        var owner = new ItemHandoutOwnerReference(item.Id);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        _builder.ItemHolders.Calls.Clear();
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingItemRepository(new EfItemRepository(context));
        var service = _builder.CreateHandoutService(context, items: recording);
        var files = _builder.CreateHandoutFileService(context, items: recording);

        var got = await service.GetAsync(campaignId, accountId, owner, handout.Id, CancellationToken.None);
        var created = await service.CreateAsync(campaignId, accountId, owner, HandoutKind.Text, HandoutVisibility.KeeperFacing, "X", Text, CancellationToken.None);
        var edited = await service.EditAsync(campaignId, accountId, owner, handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "X", Text, CancellationToken.None);
        var removed = await service.RemoveAsync(campaignId, accountId, owner, handout.Id, CancellationToken.None);
        var reordered = await service.ReorderAsync(campaignId, accountId, owner, [handout.Id], CancellationToken.None);
        var fileCreated = await files.CreateAsync(campaignId, accountId, owner, HandoutKind.Image, HandoutVisibility.KeeperFacing, "X", Upload(HandoutFileSamples.Png()), CancellationToken.None);
        var opened = await files.OpenAsync(campaignId, accountId, owner, handout.Id, CancellationToken.None);

        Assert.Null(got);
        Assert.Equal(HandoutWriteOutcome.NotFound, created.Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, edited.Outcome);
        Assert.Equal(HandoutRemoveOutcome.NotFound, removed);
        Assert.Equal(HandoutReorderOutcome.NotFound, reordered.Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, fileCreated.Outcome);
        Assert.Equal(HandoutFileOpenOutcome.NotFound, opened.Outcome);
        Assert.Empty(recording.Calls);
        Assert.Empty(_builder.ItemHolders.Calls);
        Assert.Equal(0, _builder.FileStore.CallCount);
        Assert.Single(await StoredHandoutsAsync(item.Id));
    }

    [Fact]
    public async Task Given_an_Item_of_another_Campaign_or_an_unknown_Handout_When_using_ids_Then_everything_is_NotFound()
    {
        var foreign = await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId);
        var foreignHandout = await _builder.AddItemHandoutAsync(_builder.OtherCampaignOfSameKeeperId, foreign.Id);
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        Assert.Equal(HandoutRemoveOutcome.NotFound, await RemoveAsync(foreign.Id, foreignHandout.Id));
        Assert.Equal(HandoutRemoveOutcome.NotFound, await RemoveAsync(item.Id, Guid.NewGuid()));
        Assert.Equal(HandoutRemoveOutcome.NotFound, await RemoveAsync(item.Id, foreignHandout.Id));
        Assert.Single((await _builder.GetItemAsync(_builder.OtherCampaignOfSameKeeperId, foreign.Id))!.Handouts);
    }

    [Fact]
    public async Task Given_an_Item_not_in_play_When_removing_a_file_Handout_Then_it_is_removed_and_its_file_is_deleted_after_the_commit()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (handout, key) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);

        var outcome = await RemoveAsync(item.Id, handout.Id);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        Assert.Equal([key], _builder.FileStore.DeletedKeys);
        Assert.Empty(await StoredHandoutsAsync(item.Id));
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_When_removing_a_Handout_Then_it_is_removed()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House");
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenario.Id, scene.Id, item.Id);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        Assert.Equal(HandoutRemoveOutcome.Removed, await RemoveAsync(item.Id, handout.Id));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_a_played_Scene_When_removing_a_file_Handout_Then_it_is_refused_and_no_file_is_deleted(SceneStatus status)
    {
        var itemId = await PlayedItemAsync(status);
        var (handout, key) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, itemId);

        var outcome = await RemoveAsync(itemId, handout.Id);

        Assert.Equal(HandoutRemoveOutcome.InPlay, outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Contains(key, _builder.FileStore.StoredKeys);
        Assert.Single(await StoredHandoutsAsync(itemId));
    }

    [Fact]
    public async Task Given_a_held_Item_When_removing_a_Handout_Then_it_is_refused_as_in_play()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        _builder.ItemHolders.Hold(item.Id, Guid.NewGuid());

        Assert.Equal(HandoutRemoveOutcome.InPlay, await RemoveAsync(item.Id, handout.Id));
        Assert.Single(await StoredHandoutsAsync(item.Id));
    }

    [Fact]
    public async Task Given_an_Item_in_play_When_removing_an_unknown_Handout_Then_it_is_refused_as_in_play()
    {
        var itemId = await PlayedItemAsync(SceneStatus.Active);

        Assert.Equal(HandoutRemoveOutcome.InPlay, await RemoveAsync(itemId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Given_an_Item_not_in_play_When_replacing_a_file_Then_the_old_file_is_deleted_after_the_commit()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (handout, oldKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);

        var result = await ReplaceImageAsync(item.Id, handout.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Equal([oldKey], _builder.FileStore.DeletedKeys);
        var newKey = Assert.Single(_builder.FileStore.StoredKeys);
        Assert.NotEqual(oldKey, newKey);
        Assert.Equal("image/jpeg", result.Handout!.File!.MediaType);
    }

    [Fact]
    public async Task Given_an_Item_in_play_When_replacing_a_file_Then_the_old_file_is_kept_beside_the_new_one()
    {
        var itemId = await PlayedItemAsync(SceneStatus.Finished);
        var (handout, oldKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, itemId);

        var result = await ReplaceImageAsync(itemId, handout.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Equal(2, _builder.FileStore.StoredKeys.Count);
        Assert.Contains(oldKey, _builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_held_Item_When_replacing_a_file_Then_the_old_file_is_kept()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (handout, _) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        _builder.ItemHolders.Hold(item.Id, Guid.NewGuid());

        var result = await ReplaceImageAsync(item.Id, handout.Id);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
    }

    [Fact]
    public async Task Given_a_failing_commit_When_replacing_an_Item_file_Then_the_new_file_is_deleted_and_the_old_one_is_kept()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (handout, oldKey) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var failing = new RecordingItemRepository(new EfItemRepository(context)) { FailSave = true };

        await Assert.ThrowsAsync<InvalidOperationException>(() => ReplaceImageAsync(item.Id, handout.Id, failing));

        var deleted = Assert.Single(_builder.FileStore.DeletedKeys);
        Assert.NotEqual(oldKey, deleted);
        Assert.Equal([oldKey], _builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_failing_commit_When_adding_an_Item_file_Handout_Then_the_new_file_is_deleted_and_nothing_is_stored()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();
        var failing = new RecordingItemRepository(new EfItemRepository(context)) { FailSave = true };

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            using var serviceContext = _builder.Fixture.CreateContext();
            await _builder.CreateHandoutFileService(serviceContext, items: failing).CreateAsync(
                _builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph",
                Upload(HandoutFileSamples.Png()), CancellationToken.None);
        });

        Assert.Empty(_builder.FileStore.StoredKeys);
        Assert.Single(_builder.FileStore.DeletedKeys);
        Assert.Empty(await StoredHandoutsAsync(item.Id));
    }

    [Fact]
    public async Task Given_an_Item_file_Handout_When_opening_it_Then_the_stored_bytes_are_returned_and_a_rich_text_Handout_is_NotFound()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (image, _) = await _builder.AddItemImageHandoutAsync(_builder.CampaignId, item.Id);
        var text = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateHandoutFileService(context);
        var owner = new ItemHandoutOwnerReference(item.Id);

        var opened = await service.OpenAsync(_builder.CampaignId, Keeper, owner, image.Id, CancellationToken.None);
        var richText = await service.OpenAsync(_builder.CampaignId, Keeper, owner, text.Id, CancellationToken.None);

        Assert.Equal(HandoutFileOpenOutcome.Opened, opened.Outcome);
        await using var content = opened.Download!.Content;
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy);
        Assert.Equal(HandoutFileSamples.Png(), copy.ToArray());
        Assert.Equal(HandoutFileOpenOutcome.NotFound, richText.Outcome);
    }

    [Fact]
    public async Task Given_an_unsupported_file_When_adding_an_Item_file_Handout_Then_it_is_refused_and_nothing_is_stored()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHandoutFileService(context).CreateAsync(
            _builder.CampaignId, Keeper, new ItemHandoutOwnerReference(item.Id), HandoutKind.Image, HandoutVisibility.PlayerFacing, "Drawing",
            Upload(HandoutFileSamples.Svg(), "drawing.svg"), CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.UnsupportedFileType, result.Outcome);
        Assert.Empty(_builder.FileStore.StoredKeys);
        Assert.Empty(await StoredHandoutsAsync(item.Id));
    }
}
