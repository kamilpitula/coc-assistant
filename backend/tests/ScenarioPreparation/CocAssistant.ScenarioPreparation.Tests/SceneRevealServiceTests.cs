namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The provider service Scene Play calls to reveal, list Clues, and find a Reveal's file (PBI-SPL-002 D1, D2, D5), and the stored
/// Reveal snapshots: persistence, constraints, and the replace that loses to a start.
/// </summary>
public class SceneRevealServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid[] Approved = [SceneStartExtensions.Harvey, SceneStartExtensions.Lucy];

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(string title = "The Corbitt House")
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, title)).Id);
    }

    private async Task StartAsync(Guid sceneId, params Guid[] present)
    {
        using var context = _builder.Fixture.CreateContext();
        var result = await _builder.CreateLifecycleService(context)
            .StartAsync(_builder.CampaignId, sceneId, present.Length == 0 ? [Harvey, Lucy] : present, Approved, false, CancellationToken.None);
        Assert.Equal(SceneStartOutcome.Started, result.Outcome);
    }

    private async Task<SceneRevealResult> RevealAsync(RevealSubjectType type, Guid subjectId, Guid[]? recipients = null, ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        var service = new SceneRevealService(repository ?? new EfSceneRepository(context), _builder.TimeProvider);
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        return await service.RevealAsync(_builder.CampaignId, type, subjectId, recipients, CancellationToken.None);
    }

    private async Task<IReadOnlyList<ClueView>> CluesAsync(Guid investigatorId, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new SceneRevealService(new EfSceneRepository(context), _builder.TimeProvider)
            .ListCluesAsync(campaignId ?? _builder.CampaignId, investigatorId, CancellationToken.None);
    }

    private async Task<RevealFileView?> FileOfAsync(Guid revealId, Guid? campaignId = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new SceneRevealService(new EfSceneRepository(context), _builder.TimeProvider)
            .FindRevealFileAsync(campaignId ?? _builder.CampaignId, revealId, CancellationToken.None);
    }

    private async Task<HandoutView> AddImageAsync(Guid scenarioId, Guid sceneId, string? description = "A cellar plan")
    {
        var png = HandoutFileSamples.Png();
        using var context = _builder.Fixture.CreateContext();
        var result = await _builder.CreateHandoutFileService(context).CreateAsync(
            _builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), HandoutKind.Map, HandoutVisibility.PlayerFacing, "Corbitt House cellar",
            new HandoutUpload("cellar.png", png.Length, new MemoryStream(png)), description, CancellationToken.None);
        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        return result.Handout!;
    }

    [Fact]
    public async Task Given_no_active_scene_When_revealing_Then_it_answers_no_active_scene()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        var result = await RevealAsync(RevealSubjectType.Handout, handout.Id);

        Assert.Equal(SceneRevealOutcome.NoActiveScene, result.Outcome);
        Assert.Null(result.Reveal);
    }

    [Fact]
    public async Task Given_an_active_scene_When_revealing_a_handout_to_one_investigator_Then_it_is_saved_without_a_version_bump()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        await StartAsync(sceneId);

        var result = await RevealAsync(RevealSubjectType.Handout, handout.Id, [Lucy]);

        Assert.Equal(SceneRevealOutcome.Revealed, result.Outcome);
        Assert.Equal([Lucy], result.Reveal!.RecipientIds);
        using var context = _builder.Fixture.CreateContext();
        var stored = await new EfSceneRepository(context).FindForPlayAsync(_builder.CampaignId, sceneId, CancellationToken.None);
        Assert.Equal(1, stored!.Version);
        var reveal = Assert.Single(stored.Reveals);
        Assert.Equal([Lucy], reveal.RecipientIds);
        Assert.Equal((handout.Title, HandoutKind.ReadAloud), (reveal.Title, reveal.HandoutKind));
    }

    [Fact]
    public async Task Given_a_refused_reveal_When_revealing_Then_nothing_is_saved()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, visibility: HandoutVisibility.KeeperFacing);
        await StartAsync(sceneId);
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingSceneRepository(new EfSceneRepository(context));

        var result = await RevealAsync(RevealSubjectType.Handout, handout.Id, null, recording);

        Assert.Equal(SceneRevealOutcome.SubjectKeeperFacing, result.Outcome);
        Assert.DoesNotContain(nameof(ISceneRepository.SaveChangesAsync), recording.Calls);
        Assert.Equal(0, await context.Set<Reveal>().CountAsync());
    }

    [Fact]
    public async Task Given_a_revealed_handout_When_it_is_edited_and_the_link_unlinked_Then_the_stored_snapshot_is_unchanged()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var humanNpc = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var link = await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, humanNpc.Id, "A nervous clerk", ScenarioPreparationTestBuilder.RichText("Sweating"));
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId, "Original title");
        await StartAsync(sceneId);
        await RevealAsync(RevealSubjectType.Handout, handout.Id, [Harvey]);
        await RevealAsync(RevealSubjectType.NonPlayerEntity, link.Id, [Harvey]);

        using (var context = _builder.Fixture.CreateContext())
        {
            var edited = await _builder.CreateHandoutService(context).EditAsync(
                _builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Renamed",
                ScenarioPreparationTestBuilder.RichText("Changed"), CancellationToken.None);
            Assert.Equal(HandoutWriteOutcome.Saved, edited.Outcome);
        }

        using (var context = _builder.Fixture.CreateContext())
        {
            var outcome = await _builder.CreateLinkService(context).UnlinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, link.Id, CancellationToken.None);
            Assert.Equal(NonPlayerEntityUnlinkOutcome.Unlinked, outcome);
        }

        var clues = await CluesAsync(Harvey);
        Assert.Equal(["A nervous clerk", "Original title"], clues.Select(clue => clue.Reveal.Title).Order(StringComparer.Ordinal).ToList());
    }

    [Fact]
    public async Task Given_reveals_on_two_scenes_When_listing_clues_Then_only_the_investigators_across_scenes_and_campaign_newest_first()
    {
        var (scenarioId, firstId) = await SceneAsync("First");
        var secondId = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "Second")).Id;
        var one = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, firstId, "One");
        var two = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, secondId, "Two");
        var three = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, firstId, "Three");
        await StartAsync(firstId);
        await RevealAsync(RevealSubjectType.Handout, one.Id, [Harvey]);
        await RevealAsync(RevealSubjectType.Handout, three.Id, [Lucy]);
        using (var context = _builder.Fixture.CreateContext())
        {
            await _builder.CreateLifecycleService(context).FinishActiveAsync(_builder.CampaignId, CancellationToken.None);
        }

        await StartAsync(secondId, Harvey);
        await RevealAsync(RevealSubjectType.Handout, two.Id, [Harvey]);

        var clues = await CluesAsync(Harvey);

        Assert.Equal(["Two", "One"], clues.Select(clue => clue.Reveal.Title).ToList());
        Assert.Equal(["Second", "First"], clues.Select(clue => clue.SceneTitle).ToList());
        Assert.Equal([secondId, firstId], clues.Select(clue => clue.SceneId).ToList());
        Assert.Empty(await CluesAsync(Harvey, Guid.NewGuid()));
        Assert.Equal(["Three"], (await CluesAsync(Lucy)).Select(clue => clue.Reveal.Title).ToList());
        Assert.Empty(await CluesAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Given_a_revealed_file_handout_When_finding_the_file_Then_the_snapshotted_key_and_recipients_are_returned_only_within_the_campaign()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await AddImageAsync(scenarioId, sceneId);
        var originalKey = Assert.Single(_builder.FileStore.StoredKeys);
        await StartAsync(sceneId);
        var reveal = (await RevealAsync(RevealSubjectType.Handout, handout.Id, [Harvey])).Reveal!;

        var file = await FileOfAsync(reveal.Id);

        Assert.Equal((originalKey, "cellar.png", "image/png"), (file!.Key, file.Name, file.MediaType));
        Assert.Equal([Harvey], file.RecipientIds);
        Assert.Null(await FileOfAsync(reveal.Id, Guid.NewGuid()));
        Assert.Null(await FileOfAsync(Guid.NewGuid()));
        Assert.Equal("A cellar plan", reveal.ImageDescription);
    }

    [Fact]
    public async Task Given_a_revealed_file_When_the_file_is_replaced_on_the_active_scene_Then_the_reveal_still_serves_the_old_key_and_the_blob_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await AddImageAsync(scenarioId, sceneId);
        var originalKey = Assert.Single(_builder.FileStore.StoredKeys);
        await StartAsync(sceneId);
        var reveal = (await RevealAsync(RevealSubjectType.Handout, handout.Id)).Reveal!;
        var png = HandoutFileSamples.Png();

        using (var context = _builder.Fixture.CreateContext())
        {
            var edit = await _builder.CreateHandoutFileService(context).EditAsync(
                _builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, HandoutKind.Map, HandoutVisibility.PlayerFacing, "Corbitt House cellar",
                new HandoutUpload("new.png", png.Length, new MemoryStream(png)), "Changed", CancellationToken.None);
            Assert.Equal(HandoutWriteOutcome.Saved, edit.Outcome);
        }

        Assert.Equal(originalKey, (await FileOfAsync(reveal.Id))!.Key);
        Assert.Contains(originalKey, _builder.FileStore.StoredKeys);
        Assert.Equal(2, _builder.FileStore.StoredKeys.Count());
    }

    [Fact]
    public async Task Given_a_start_wins_the_race_When_replacing_a_prepared_scene_file_Then_it_is_refused_in_play_and_the_old_blob_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await AddImageAsync(scenarioId, sceneId);
        var oldKey = Assert.Single(_builder.FileStore.StoredKeys);
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context)) { BeforeSave = () => _builder.PlayAsync(sceneId, SceneStatus.Active) };
        var png = HandoutFileSamples.Png();

        var result = await _builder.CreateHandoutFileService(context, racing).EditAsync(
            _builder.CampaignId, Keeper, new SceneHandoutOwnerReference(scenarioId, sceneId), handout.Id, HandoutKind.Map, HandoutVisibility.PlayerFacing, "Corbitt House cellar",
            new HandoutUpload("new.png", png.Length, new MemoryStream(png)), null, CancellationToken.None);

        Assert.Equal(HandoutWriteOutcome.InPlay, result.Outcome);
        Assert.Equal([oldKey], _builder.FileStore.StoredKeys.ToList());
    }

    [Theory]
    [InlineData("INSERT INTO Reveals (Id, SceneId, SubjectType, SubjectId, RevealedAt, Title, HandoutKind, Content) VALUES ('{0}', '{1}', 'NonPlayerEntity', '{0}', '2026-10-29', 'x', 'Map', 'c')")]
    [InlineData("INSERT INTO Reveals (Id, SceneId, SubjectType, SubjectId, RevealedAt, Title, HandoutKind, Content, FileKey, FileName, FileMediaType, FileSizeBytes) VALUES ('{0}', '{1}', 'Handout', '{0}', '2026-10-29', 'x', 'Map', 'c', 'k', 'n', 'image/png', 1)")]
    [InlineData("INSERT INTO Reveals (Id, SceneId, SubjectType, SubjectId, RevealedAt, Title, HandoutKind, Content, FileKey) VALUES ('{0}', '{1}', 'Handout', '{0}', '2026-10-29', 'x', 'Map', NULL, 'k')")]
    [InlineData("INSERT INTO Reveals (Id, SceneId, SubjectType, SubjectId, RevealedAt, Title, HandoutKind) VALUES ('{0}', '{1}', 'Handout', '{0}', '2026-10-29', 'x', 'Text')")]
    [InlineData("INSERT INTO Reveals (Id, SceneId, SubjectType, SubjectId, RevealedAt, Title, ImageDescription) VALUES ('{0}', '{1}', 'NonPlayerEntity', '{0}', '2026-10-29', 'x', 'alt')")]
    public async Task Given_a_reveal_row_that_breaks_the_snapshot_shape_When_inserted_Then_the_database_refuses_it(string insert)
    {
        var (_, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var sql = string.Format(System.Globalization.CultureInfo.InvariantCulture, insert, Guid.NewGuid().ToString().ToUpperInvariant(), sceneId.ToString().ToUpperInvariant());

        await Assert.ThrowsAnyAsync<Exception>(() => context.Database.ExecuteSqlRawAsync(sql));
    }

    [Fact]
    public async Task Given_a_text_handout_row_with_an_image_description_When_inserted_Then_the_database_refuses_it()
    {
        var (_, sceneId) = await SceneAsync();
        using var context = _builder.Fixture.CreateContext();
        var sql = $"INSERT INTO Handouts (Id, SceneId, Kind, Visibility, Title, Content, ImageDescription, Position, CreatedAt) VALUES ('{Guid.NewGuid()}', '{sceneId}', 'Text', 'PlayerFacing', 't', 'c', 'alt', 1, '2026-10-29')";

        await Assert.ThrowsAnyAsync<Exception>(() => context.Database.ExecuteSqlRawAsync(sql));
    }
}
