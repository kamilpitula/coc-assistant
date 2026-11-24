namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// A Scene's Keeper notes carry their own version beside the Scene version (ADR 0037): one conditional statement replaces
/// them without touching the Scene version, so a finish or a title edit committed after an interleaved notes save still succeeds.
/// </summary>
public class SceneKeeperNotesRepositoryTests : IDisposable
{
    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar\"}]}]}}";
    private const string OtherNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Attic\"}]}]}}";

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync(string? keeperNotes = Notes)
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House", "Arkham", keeperNotes)).Id);
    }

    private async Task<Scene> StoredSceneAsync(Guid sceneId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await context.Scenes.AsNoTracking().SingleAsync(candidate => candidate.Id == sceneId);
    }

    [Fact]
    public async Task Given_a_scene_When_reading_its_notes_Then_the_view_carries_the_notes_and_version_zero()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        using var context = _builder.Fixture.CreateContext();
        var view = await new EfSceneRepository(context).FindKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);

        Assert.Equal((sceneId, Notes, 0), (view!.Id, view.KeeperNotes, view.NotesVersion));
    }

    [Fact]
    public async Task Given_a_scene_of_another_scenario_When_reading_its_notes_Then_it_is_not_found()
    {
        var (_, sceneId) = await SceneAsync();
        var other = await _builder.CreateScenarioAsync(_builder.CampaignId, "Edge of Darkness");

        using var context = _builder.Fixture.CreateContext();
        var view = await new EfSceneRepository(context).FindKeeperNotesAsync(_builder.CampaignId, other.Id, sceneId, CancellationToken.None);

        Assert.Null(view);
    }

    [Fact]
    public async Task Given_the_current_version_When_replacing_the_notes_Then_they_are_stored_and_only_the_notes_version_advances()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        using var context = _builder.Fixture.CreateContext();
        var replaced = await new EfSceneRepository(context).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None);

        Assert.True(replaced);
        Assert.Equal((OtherNotes, 1, 0), ((await StoredSceneAsync(sceneId)).KeeperNotes, (await StoredSceneAsync(sceneId)).NotesVersion, (await StoredSceneAsync(sceneId)).Version));
    }

    [Fact]
    public async Task Given_a_stale_version_When_replacing_the_notes_Then_nothing_changes()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        using var context = _builder.Fixture.CreateContext();
        var repository = new EfSceneRepository(context);
        Assert.True(await repository.TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None));

        Assert.False(await repository.TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None));
        Assert.Equal((OtherNotes, 1), ((await StoredSceneAsync(sceneId)).KeeperNotes, (await StoredSceneAsync(sceneId)).NotesVersion));
    }

    [Fact]
    public async Task Given_null_notes_When_replacing_Then_the_notes_are_cleared_and_the_version_advances()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        using var context = _builder.Fixture.CreateContext();
        Assert.True(await new EfSceneRepository(context).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, null, 0, CancellationToken.None));

        Assert.Equal((null, 1), ((await StoredSceneAsync(sceneId)).KeeperNotes, (await StoredSceneAsync(sceneId)).NotesVersion));
    }

    [Fact]
    public async Task Given_a_removed_scene_When_replacing_its_notes_Then_nothing_is_replaced()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using (var remover = _builder.Fixture.CreateContext())
        {
            var repository = new EfSceneRepository(remover);
            var scene = (await repository.FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None))!;
            repository.Remove(scene);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var context = _builder.Fixture.CreateContext();
        Assert.False(await new EfSceneRepository(context).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None));
        Assert.Null(await new EfSceneRepository(context).FindKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None));
    }

    [Fact]
    public async Task Given_an_interleaved_notes_save_When_finishing_the_tracked_scene_Then_the_finish_commits_and_keeps_the_new_notes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        await _builder.PlayAsync(sceneId, SceneStatus.Active);
        using var tracked = _builder.Fixture.CreateContext();
        var repository = new EfSceneRepository(tracked);
        var scene = (await repository.FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None))!;

        using (var interleaved = _builder.Fixture.CreateContext())
        {
            Assert.True(await new EfSceneRepository(interleaved).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None));
        }

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.Finish(_builder.TimeProvider.GetUtcNow()));
        await repository.SaveChangesAsync(CancellationToken.None);

        var stored = await StoredSceneAsync(sceneId);
        Assert.Equal((SceneStatus.Finished, OtherNotes, 1, 2), (stored.Status, stored.KeeperNotes, stored.NotesVersion, stored.Version));
    }

    [Fact]
    public async Task Given_an_interleaved_notes_save_When_editing_title_and_location_Then_the_edit_commits_and_keeps_the_new_notes()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        using var tracked = _builder.Fixture.CreateContext();
        var repository = new EfSceneRepository(tracked);
        var scene = (await repository.FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None))!;

        using (var interleaved = _builder.Fixture.CreateContext())
        {
            Assert.True(await new EfSceneRepository(interleaved).TryReplaceKeeperNotesAsync(_builder.CampaignId, scenarioId, sceneId, OtherNotes, 0, CancellationToken.None));
        }

        Assert.Equal(SceneFieldsOutcome.Accepted, scene.Edit("Renamed", "Elsewhere"));
        await repository.SaveChangesAsync(CancellationToken.None);

        var stored = await StoredSceneAsync(sceneId);
        Assert.Equal(("Renamed", "Elsewhere", OtherNotes, 1, 0), (stored.Title, stored.Location, stored.KeeperNotes, stored.NotesVersion, stored.Version));
    }
}
