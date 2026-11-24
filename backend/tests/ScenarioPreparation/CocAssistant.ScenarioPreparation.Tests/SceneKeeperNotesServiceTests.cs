namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Saving a Scene's Keeper notes through their own versioned endpoint (specs/scenario-preparation/spec.md, ADR 0037).
/// Keeper and Scene checks come first; a stale version is refused with the current notes before any rich-text check; each
/// save publishes the scenes topic once, and a refusal never does.
/// </summary>
public class SceneKeeperNotesServiceTests : IDisposable
{
    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar\"}]}]}}";
    private const string OtherNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Attic\"}]}]}}";
    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;
    private static readonly Guid Player = ScenarioPreparationTestBuilder.PlayerAccountId;
    private static readonly Guid OtherKeeper = ScenarioPreparationTestBuilder.OtherKeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(string? keeperNotes = Notes)
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House", "Arkham", keeperNotes)).Id);
    }

    private async Task<SceneKeeperNotesWriteResult> SaveAsync(
        Guid campaignId,
        Guid caller,
        Guid scenarioId,
        Guid sceneId,
        string? keeperNotes,
        int? notesVersion,
        ISceneRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateKeeperNotesService(context, repository).SaveAsync(campaignId, caller, scenarioId, sceneId, keeperNotes, notesVersion, CancellationToken.None);
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_any_status_When_the_Keeper_saves_at_the_current_version_Then_the_notes_are_replaced_and_signalled_once(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        await _builder.PlayAsync(sceneId, status);

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, OtherNotes, 0);

        Assert.Equal(SceneKeeperNotesWriteOutcome.Saved, result.Outcome);
        Assert.Equal((sceneId, OtherNotes, 1), (result.Notes!.Id, result.Notes.KeeperNotes, result.Notes.NotesVersion));
        Assert.Equal([_builder.CampaignId], _builder.Signals.CampaignIds);
        Assert.Equal(OtherNotes, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.KeeperNotes);
    }

    [Fact]
    public async Task Given_absent_notes_When_the_Keeper_saves_Then_the_notes_are_cleared()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, null, 0);

        Assert.Equal((SceneKeeperNotesWriteOutcome.Saved, null, 1), (result.Outcome, result.Notes!.KeeperNotes, result.Notes.NotesVersion));
        Assert.Null((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.KeeperNotes);
    }

    [Theory]
    [InlineData("player")]
    [InlineData("other keeper")]
    [InlineData("missing campaign")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_saving_Then_it_is_not_found_and_nothing_is_touched(string caller)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        var (campaignId, accountId) = caller switch
        {
            "player" => (_builder.CampaignId, Player),
            "other keeper" => (_builder.CampaignId, OtherKeeper),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingSceneRepository(new EfSceneRepository(context));

        var result = await _builder.CreateKeeperNotesService(context, recording).SaveAsync(campaignId, accountId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None);

        Assert.Equal(SceneKeeperNotesWriteOutcome.NotFound, result.Outcome);
        Assert.Null(result.Notes);
        Assert.Empty(recording.Calls);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_scene_of_another_scenario_When_saving_Then_it_is_not_found()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        var other = await _builder.CreateScenarioAsync(_builder.CampaignId, "Edge of Darkness");

        var result = await SaveAsync(_builder.CampaignId, Keeper, other.Id, sceneId, OtherNotes, 0);

        Assert.Equal(SceneKeeperNotesWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_a_missing_notes_version_When_saving_Then_it_is_a_version_problem_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, OtherNotes, null);

        Assert.Equal(SceneKeeperNotesWriteOutcome.MissingNotesVersion, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
        Assert.Equal(Notes, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.KeeperNotes);
    }

    [Fact]
    public async Task Given_a_stale_version_When_saving_Then_the_current_notes_are_returned_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        Assert.Equal(SceneKeeperNotesWriteOutcome.Saved, (await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, OtherNotes, 0)).Outcome);
        _builder.Signals.CampaignIds.Clear();

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, Notes, 0);

        Assert.Equal(SceneKeeperNotesWriteOutcome.StaleNotesVersion, result.Outcome);
        Assert.Equal((sceneId, OtherNotes, 1), (result.Notes!.Id, result.Notes.KeeperNotes, result.Notes.NotesVersion));
        Assert.Empty(_builder.Signals.CampaignIds);
        Assert.Equal(OtherNotes, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.KeeperNotes);
    }

    [Fact]
    public async Task Given_a_stale_and_invalid_save_When_saving_Then_the_stale_version_wins()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, "{}", 1);

        Assert.Equal(SceneKeeperNotesWriteOutcome.StaleNotesVersion, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_invalid_notes_When_saving_Then_they_are_refused_and_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();

        var result = await SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, ImageNotes, 0);

        Assert.Equal(SceneKeeperNotesWriteOutcome.InvalidKeeperNotes, result.Outcome);
        Assert.Null(result.Notes);
        Assert.Empty(_builder.Signals.CampaignIds);
        Assert.Equal(Notes, (await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.KeeperNotes);
    }

    [Fact]
    public async Task Given_the_scene_is_removed_mid_save_When_saving_Then_it_is_not_found()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        racing.BeforeTryReplace = async () =>
        {
            using var remover = _builder.Fixture.CreateContext();
            var repository = new EfSceneRepository(remover);
            var scene = (await repository.FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None))!;
            repository.Remove(scene);
            await repository.SaveChangesAsync(CancellationToken.None);
        };

        var result = await _builder.CreateKeeperNotesService(context, racing).SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None);

        Assert.Equal(SceneKeeperNotesWriteOutcome.NotFound, result.Outcome);
        Assert.Empty(_builder.Signals.CampaignIds);
    }

    [Fact]
    public async Task Given_another_tab_saves_mid_save_When_saving_Then_the_newer_notes_are_returned()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        _builder.Signals.CampaignIds.Clear();
        using var context = _builder.Fixture.CreateContext();
        var racing = new RecordingSceneRepository(new EfSceneRepository(context));
        racing.BeforeTryReplace = async () =>
        {
            using var otherTab = _builder.Fixture.CreateContext();
            Assert.True(await new EfSceneRepository(otherTab).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, ImageNotes, 0, CancellationToken.None));
        };

        var result = await _builder.CreateKeeperNotesService(context, racing).SaveAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None);

        Assert.Equal(SceneKeeperNotesWriteOutcome.StaleNotesVersion, result.Outcome);
        Assert.Equal((ImageNotes, 1), (result.Notes!.KeeperNotes, result.Notes.NotesVersion));
        Assert.Empty(_builder.Signals.CampaignIds);
    }
}
