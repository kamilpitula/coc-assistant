namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Adding, replacing, and opening the file of an Image, Document, or Map Handout as the Keeper, and what happens to the stored
/// blobs around each commit (PBI-SP-007 D5, D6, ADR 0021). Everyone else ends in NotFound before any Scene or blob is read.
/// </summary>
public class HandoutFileServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private static HandoutUpload Upload(byte[] bytes, string name = "plan.png", long? length = null) =>
        new(name, length ?? bytes.Length, new MemoryStream(bytes));

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<HandoutWriteResult> CreateAsync(
        Guid scenarioId,
        Guid sceneId,
        HandoutUpload? upload,
        HandoutKind? kind = HandoutKind.Image,
        string title = "Floor plan",
        HandoutVisibility? visibility = HandoutVisibility.PlayerFacing,
        Guid? caller = null,
        ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context, repository)
            .CreateAsync(_builder.CampaignId, caller ?? Keeper, scenarioId, sceneId, kind, visibility, title, upload, CancellationToken.None);
    }

    private async Task<HandoutWriteResult> EditAsync(
        Guid scenarioId,
        Guid sceneId,
        Guid handoutId,
        HandoutUpload? upload,
        HandoutKind? kind = HandoutKind.Image,
        string title = "Renamed",
        HandoutVisibility? visibility = HandoutVisibility.KeeperFacing,
        Guid? caller = null,
        ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context, repository)
            .EditAsync(_builder.CampaignId, caller ?? Keeper, scenarioId, sceneId, handoutId, kind, visibility, title, upload, CancellationToken.None);
    }

    private async Task<HandoutFileOpenResult> OpenAsync(Guid scenarioId, Guid sceneId, Guid handoutId, Guid? caller = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutFileService(context)
            .OpenAsync(_builder.CampaignId, caller ?? Keeper, scenarioId, sceneId, handoutId, CancellationToken.None);
    }

    private async Task<(HandoutView Handout, string Key)> AddImageAsync(Guid scenarioId, Guid sceneId)
    {
        var created = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));
        return (created.Handout!, Assert.Single(_builder.FileStore.StoredKeys));
    }

    private async Task<int> StoredHandoutCountAsync(Guid scenarioId, Guid sceneId) =>
        (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Handouts.Count;

    [Fact]
    public async Task Given_the_Keeper_When_adding_an_image_Then_the_blob_is_stored_under_a_new_key_and_the_view_carries_the_file()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var png = HandoutFileSamples.Png();

        var result = await CreateAsync(scenarioId, sceneId, Upload(png, "..\\maps\\Corbitt plan.png"));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        var key = Assert.Single(_builder.FileStore.StoredKeys);
        Assert.Matches("^[0-9a-f]{32}$", key);
        Assert.Equal(png, _builder.FileStore.BytesOf(key));
        Assert.Equal("image/png", _builder.FileStore.MediaTypeOf(key));
        Assert.Equal((HandoutKind.Image, null, new HandoutFileView("Corbitt plan.png", "image/png", png.Length)), (result.Handout!.Kind, result.Handout.Content, result.Handout.File));
        Assert.Equal(1, await StoredHandoutCountAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_pdf_named_like_an_image_When_adding_a_document_Then_the_bytes_decide_the_media_type()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Pdf(), "letter.png"), HandoutKind.Document, "Letter");

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Equal("application/pdf", result.Handout!.File!.MediaType);
    }

    [Theory]
    [InlineData("", "image")]
    [InlineData("  ..\\  ", "image")]
    public async Task Given_an_empty_file_name_When_adding_Then_a_default_name_for_the_kind_is_used(string name, string expected)
    {
        var (scenarioId, sceneId) = await SceneAsync();

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png(), name));

        Assert.Equal(expected, result.Handout!.File!.Name);
    }

    [Fact]
    public async Task Given_an_empty_file_name_When_adding_a_document_Then_the_name_is_document()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Pdf(), string.Empty), HandoutKind.Document, "Letter");

        Assert.Equal("document", result.Handout!.File!.Name);
    }

    [Fact]
    public async Task Given_control_characters_and_a_very_long_name_When_adding_Then_the_stored_name_is_clean_and_at_most_255_characters()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var name = "a\u0007b\r\n" + new string('x', 300) + ".png";

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png(), name));

        var stored = result.Handout!.File!.Name;
        Assert.Equal(255, stored.Length);
        Assert.StartsWith("abxxx", stored);
        Assert.DoesNotContain(stored, character => char.IsControl(character));
    }

    [Fact]
    public async Task Given_a_refused_add_When_creating_Then_nothing_is_uploaded()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var png = HandoutFileSamples.Png();

        Assert.Equal(HandoutWriteOutcome.InvalidTitle, (await CreateAsync(scenarioId, sceneId, Upload(png), title: " ")).Outcome);
        Assert.Equal(HandoutWriteOutcome.InvalidKind, (await CreateAsync(scenarioId, sceneId, Upload(png), kind: HandoutKind.Text)).Outcome);
        Assert.Equal(HandoutWriteOutcome.InvalidVisibility, (await CreateAsync(scenarioId, sceneId, Upload(png), visibility: null)).Outcome);
        Assert.Equal(HandoutWriteOutcome.MissingFile, (await CreateAsync(scenarioId, sceneId, null)).Outcome);
        Assert.Equal(HandoutWriteOutcome.MissingFile, (await CreateAsync(scenarioId, sceneId, Upload([]))).Outcome);
        Assert.Equal(HandoutWriteOutcome.UnsupportedFileType, (await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Svg(), "a.png"))).Outcome);
        Assert.Equal(HandoutWriteOutcome.UnsupportedFileType, (await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Gif()), HandoutKind.Document)).Outcome);
        Assert.Equal(HandoutWriteOutcome.FileTooLarge, (await CreateAsync(scenarioId, sceneId, Upload(png, length: Handout.FileMaxBytes + 1))).Outcome);
        Assert.Equal(0, _builder.FileStore.CallCount);
        Assert.Equal(0, await StoredHandoutCountAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_finished_scene_When_adding_Then_it_is_refused_and_nothing_is_uploaded()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.Finished, result.Outcome);
        Assert.Equal(0, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_store_that_fails_When_adding_Then_nothing_is_saved_and_the_outcome_is_storage_failed()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.FileStore.FailSave = true;

        var result = await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.StorageFailed, result.Outcome);
        Assert.Null(result.Handout);
        Assert.Equal(0, await StoredHandoutCountAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_commit_that_fails_When_adding_Then_the_new_blob_is_deleted_and_the_failure_propagates()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context)) { FailSave = true };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _builder.CreateHandoutFileService(context, repository).CreateAsync(
                _builder.CampaignId, Keeper, scenarioId, sceneId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", Upload(HandoutFileSamples.Png()), CancellationToken.None));

        Assert.Equal(_builder.FileStore.SavedKeys, _builder.FileStore.DeletedKeys);
        Assert.Empty(_builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_commit_that_fails_and_a_store_that_fails_to_delete_When_adding_Then_the_original_failure_propagates_and_the_orphan_is_logged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context)) { FailSave = true };
        _builder.FileStore.FailDelete = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _builder.CreateHandoutFileService(context, repository).CreateAsync(
                _builder.CampaignId, Keeper, scenarioId, sceneId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", Upload(HandoutFileSamples.Png()), CancellationToken.None));

        var key = Assert.Single(_builder.FileStore.SavedKeys);
        var entry = Assert.Single(_builder.HandoutFileLogger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains(key, entry.Message);
    }

    [Fact]
    public async Task Given_a_non_keeper_or_a_foreign_campaign_When_adding_Then_not_found_without_any_store_call()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var png = HandoutFileSamples.Png();

        Assert.Equal(HandoutWriteOutcome.NotFound, (await CreateAsync(scenarioId, sceneId, Upload(png), caller: ScenarioPreparationTestBuilder.PlayerAccountId)).Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, (await CreateAsync(scenarioId, sceneId, Upload(png), caller: ScenarioPreparationTestBuilder.OtherKeeperAccountId)).Outcome);
        Assert.Equal(HandoutWriteOutcome.NotFound, (await CreateAsync(Guid.NewGuid(), sceneId, Upload(png))).Outcome);
        Assert.Equal(0, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_adding_Then_the_scene_repository_is_not_reached()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context));

        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()), caller: ScenarioPreparationTestBuilder.PlayerAccountId, repository: repository);

        Assert.Empty(repository.Calls);
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_replacing_the_file_Then_the_new_blob_is_stored_and_the_old_one_deleted_after_the_commit()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, oldKey) = await AddImageAsync(scenarioId, sceneId);
        var jpeg = HandoutFileSamples.OfSize(HandoutFileSamples.Jpeg(), 40);

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(jpeg, "new.jpg"), HandoutKind.Map);

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Equal((HandoutKind.Map, new HandoutFileView("new.jpg", "image/jpeg", 40)), (result.Handout!.Kind, result.Handout.File));
        var newKey = Assert.Single(_builder.FileStore.StoredKeys);
        Assert.NotEqual(oldKey, newKey);
        Assert.Equal([oldKey], _builder.FileStore.DeletedKeys);
        Assert.Equal(jpeg, _builder.FileStore.BytesOf(newKey));
    }

    [Fact]
    public async Task Given_a_commit_that_fails_When_replacing_Then_the_new_blob_is_deleted_and_the_old_one_is_kept()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, oldKey) = await AddImageAsync(scenarioId, sceneId);
        using var context = _builder.Fixture.CreateContext();
        var repository = new RecordingSceneRepository(new EfSceneRepository(context)) { FailSave = true };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _builder.CreateHandoutFileService(context, repository).EditAsync(
                _builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, HandoutKind.Image, HandoutVisibility.KeeperFacing, "Renamed", Upload(HandoutFileSamples.Png()), CancellationToken.None));

        Assert.Equal([oldKey], _builder.FileStore.StoredKeys);
        Assert.Single(_builder.FileStore.DeletedKeys);
        Assert.NotEqual(oldKey, _builder.FileStore.DeletedKeys[0]);
    }

    [Fact]
    public async Task Given_an_active_scene_When_replacing_the_file_Then_the_old_blob_is_kept()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, oldKey) = await AddImageAsync(scenarioId, sceneId);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png(), "new.png"));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Equal(2, _builder.FileStore.StoredKeys.Count);
        Assert.Contains(oldKey, _builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_an_edit_without_a_new_file_When_saving_Then_the_file_and_the_store_are_untouched()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        var calls = _builder.FileStore.CallCount;

        var result = await EditAsync(scenarioId, sceneId, handout.Id, null, HandoutKind.Map, "Arkham");

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        Assert.Equal((HandoutKind.Map, "Arkham", handout.File), (result.Handout!.Kind, result.Handout.Title, result.Handout.File));
        Assert.Equal(calls, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_failing_delete_after_the_commit_When_replacing_Then_the_edit_still_succeeds_and_the_key_is_logged_as_a_warning()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, oldKey) = await AddImageAsync(scenarioId, sceneId);
        _builder.FileStore.FailDelete = true;

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png(), "new.png"));

        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        var entry = Assert.Single(_builder.HandoutFileLogger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains(oldKey, entry.Message);
    }

    [Fact]
    public async Task Given_refused_edits_When_editing_Then_nothing_is_uploaded_and_the_handout_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        var calls = _builder.FileStore.CallCount;

        Assert.Equal(HandoutWriteOutcome.NotFound, (await EditAsync(scenarioId, sceneId, Guid.NewGuid(), null)).Outcome);
        Assert.Equal(HandoutWriteOutcome.KindChangeNotAllowed, (await EditAsync(scenarioId, sceneId, handout.Id, null, HandoutKind.Document)).Outcome);
        Assert.Equal(HandoutWriteOutcome.UnsupportedFileType, (await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Pdf()))).Outcome);
        Assert.Equal(HandoutWriteOutcome.FileTooLarge, (await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png(), length: Handout.FileMaxBytes + 1))).Outcome);
        Assert.Equal(calls, _builder.FileStore.CallCount);
        Assert.Equal(HandoutKind.Image, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.Handouts.Single().Kind);
    }

    [Fact]
    public async Task Given_a_finished_scene_When_editing_Then_it_is_refused()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png()));

        Assert.Equal(HandoutWriteOutcome.Finished, result.Outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
    }

    [Fact]
    public async Task Given_a_store_that_fails_When_replacing_Then_storage_failed_and_the_handout_keeps_its_file()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        _builder.FileStore.FailSave = true;

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png(), "new.png"));

        Assert.Equal(HandoutWriteOutcome.StorageFailed, result.Outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_editing_Then_not_found_without_any_store_call()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        var calls = _builder.FileStore.CallCount;

        var result = await EditAsync(scenarioId, sceneId, handout.Id, Upload(HandoutFileSamples.Png()), caller: ScenarioPreparationTestBuilder.PlayerAccountId);

        Assert.Equal(HandoutWriteOutcome.NotFound, result.Outcome);
        Assert.Equal(calls, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_the_Keeper_When_opening_a_file_Then_the_stored_bytes_and_details_are_returned()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var png = HandoutFileSamples.Png();
        var created = (await CreateAsync(scenarioId, sceneId, Upload(png))).Handout!;

        var result = await OpenAsync(scenarioId, sceneId, created.Id);

        Assert.Equal(HandoutFileOpenOutcome.Opened, result.Outcome);
        using var download = result.Download!.Content;
        using var copy = new MemoryStream();
        await download.CopyToAsync(copy);
        Assert.Equal(png, copy.ToArray());
        Assert.Equal(new HandoutFileView("plan.png", "image/png", png.Length), result.Download.File);
    }

    [Fact]
    public async Task Given_a_rich_text_handout_or_an_unknown_id_When_opening_a_file_Then_not_found()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var text = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        Assert.Equal(HandoutFileOpenOutcome.NotFound, (await OpenAsync(scenarioId, sceneId, text.Id)).Outcome);
        Assert.Equal(HandoutFileOpenOutcome.NotFound, (await OpenAsync(scenarioId, sceneId, Guid.NewGuid())).Outcome);
        Assert.Equal(0, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_opening_a_file_Then_not_found_without_any_store_call()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);
        var calls = _builder.FileStore.CallCount;

        Assert.Equal(HandoutFileOpenOutcome.NotFound, (await OpenAsync(scenarioId, sceneId, handout.Id, ScenarioPreparationTestBuilder.PlayerAccountId)).Outcome);
        Assert.Equal(HandoutFileOpenOutcome.NotFound, (await OpenAsync(scenarioId, sceneId, handout.Id, ScenarioPreparationTestBuilder.OtherKeeperAccountId)).Outcome);
        Assert.Equal(calls, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_blob_that_is_gone_When_opening_a_file_Then_storage_failed()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, key) = await AddImageAsync(scenarioId, sceneId);
        await _builder.FileStore.DeleteAsync(key, CancellationToken.None);

        var result = await OpenAsync(scenarioId, sceneId, handout.Id);

        Assert.Equal(HandoutFileOpenOutcome.StorageFailed, result.Outcome);
        Assert.Null(result.Download);
    }

    [Fact]
    public async Task Given_a_prepared_scene_When_removing_a_file_handout_Then_its_blob_is_deleted_after_the_commit()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, key) = await AddImageAsync(scenarioId, sceneId);

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateHandoutService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        Assert.Equal([key], _builder.FileStore.DeletedKeys);
        Assert.Empty(_builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_failing_delete_When_removing_a_file_handout_Then_it_is_still_removed_and_the_key_is_logged_as_a_warning()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, key) = await AddImageAsync(scenarioId, sceneId);
        _builder.FileStore.FailDelete = true;

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateHandoutService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.Removed, outcome);
        var entry = Assert.Single(_builder.HandoutLogger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains(key, entry.Message);
        Assert.Equal(0, await StoredHandoutCountAsync(scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_an_active_scene_When_removing_a_file_handout_Then_it_is_refused_and_the_blob_is_kept()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, key) = await AddImageAsync(scenarioId, sceneId);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateHandoutService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, CancellationToken.None);

        Assert.Equal(HandoutRemoveOutcome.NotPrepared, outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
        Assert.Contains(key, _builder.FileStore.StoredKeys);
    }

    [Fact]
    public async Task Given_a_rich_text_handout_When_removing_it_Then_the_store_is_not_called()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var text = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        using var context = _builder.Fixture.CreateContext();
        await _builder.CreateHandoutService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, text.Id, CancellationToken.None);

        Assert.Equal(0, _builder.FileStore.CallCount);
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_file_handouts_When_removing_the_scene_Then_every_blob_is_deleted_after_the_commit()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));
        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Pdf(), "letter.pdf"), HandoutKind.Document, "Letter");
        var keys = _builder.FileStore.StoredKeys.ToList();

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateSceneService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.Removed, outcome);
        Assert.Equal(keys.Order(), _builder.FileStore.DeletedKeys.Order());
        Assert.Null(await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId));
    }

    [Fact]
    public async Task Given_a_failing_delete_When_removing_the_scene_Then_it_is_removed_and_each_key_is_logged_as_a_warning()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));
        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));
        _builder.FileStore.FailDelete = true;

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateSceneService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.Removed, outcome);
        Assert.Equal(2, _builder.SceneLogger.Entries.Count(entry => entry.Level == LogLevel.Warning));
        Assert.All(_builder.FileStore.SavedKeys, key => Assert.Contains(_builder.SceneLogger.Entries, entry => entry.Message.Contains(key)));
    }

    [Fact]
    public async Task Given_an_active_scene_When_removing_it_Then_it_is_refused_and_no_blob_is_deleted()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await CreateAsync(scenarioId, sceneId, Upload(HandoutFileSamples.Png()));
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        using var context = _builder.Fixture.CreateContext();
        var outcome = await _builder.CreateSceneService(context).RemoveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal(SceneRemoveOutcome.NotPrepared, outcome);
        Assert.Empty(_builder.FileStore.DeletedKeys);
    }

    [Fact]
    public async Task Given_a_file_handout_When_getting_it_through_the_handout_service_Then_the_view_carries_the_file_and_no_content()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (handout, _) = await AddImageAsync(scenarioId, sceneId);

        using var context = _builder.Fixture.CreateContext();
        var view = await _builder.CreateHandoutService(context).GetAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, handout.Id, CancellationToken.None);

        Assert.Equal(handout, view);
        Assert.Null(view!.Content);
        Assert.NotNull(view.File);
    }
}
