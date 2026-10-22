namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Storing Scene Handouts: insertion through the Scene, string-stored enums, read order, and the cascade (ADR 0020).</summary>
public class HandoutPersistenceTests : IDisposable
{
    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";

    private static readonly DateTimeOffset Now = new(2026, 10, 22, 12, 0, 0, TimeSpan.Zero);

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> CreateSceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        var scene = await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House");
        return (scenario.Id, scene.Id);
    }

    private async Task<Guid> AddAsync(Guid scenarioId, Guid sceneId, string title, HandoutKind kind, HandoutVisibility visibility, DateTimeOffset at)
    {
        using var context = _builder.Fixture.CreateContext();
        var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
        var handout = scene!.AddHandout(kind, visibility, title, Text, at).Handout!;
        await context.SaveChangesAsync();
        return handout.Id;
    }

    [Fact]
    public async Task Given_a_handout_added_to_a_tracked_scene_When_saved_Then_it_is_inserted_and_read_back_with_the_scene()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();

        var handoutId = await AddAsync(scenarioId, sceneId, "The cellar", HandoutKind.ReadAloud, HandoutVisibility.KeeperFacing, Now);

        using var context = _builder.Fixture.CreateContext();
        var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
        var handout = Assert.Single(scene!.Handouts);
        Assert.Equal(
            (handoutId, sceneId, HandoutKind.ReadAloud, HandoutVisibility.KeeperFacing, "The cellar", Text, 1, Now),
            (handout.Id, handout.SceneId, handout.Kind, handout.Visibility, handout.Title, handout.Content, handout.Position, handout.CreatedAt));
    }

    [Fact]
    public async Task Given_a_stored_handout_When_reading_the_row_Then_kind_and_visibility_are_strings()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();
        await AddAsync(scenarioId, sceneId, "The cellar", HandoutKind.Text, HandoutVisibility.PlayerFacing, Now);

        using var context = _builder.Fixture.CreateContext();
        var stored = await context.Database
            .SqlQueryRaw<string>("SELECT Kind || '/' || Visibility AS Value FROM Handouts")
            .SingleAsync();

        Assert.Equal("Text/PlayerFacing", stored);
    }

    [Fact]
    public async Task Given_handouts_with_equal_positions_When_the_scene_is_read_Then_they_follow_creation_time_then_id()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();
        var later = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var earlierHigherId = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff");
        var earlierLowerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        using (var context = _builder.Fixture.CreateContext())
        {
            await InsertRawAsync(context, later, sceneId, Now.AddMinutes(5));
            await InsertRawAsync(context, earlierHigherId, sceneId, Now);
            await InsertRawAsync(context, earlierLowerId, sceneId, Now);
        }

        using var verify = _builder.Fixture.CreateContext();
        var scene = await new EfSceneRepository(verify).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
        Assert.Equal([earlierLowerId, earlierHigherId, later], scene!.Handouts.Select(handout => handout.Id));
    }

    [Fact]
    public async Task Given_a_stored_handout_When_editing_and_reordering_it_Then_the_changes_are_saved()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();
        var first = await AddAsync(scenarioId, sceneId, "First", HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, Now);
        var second = await AddAsync(scenarioId, sceneId, "Second", HandoutKind.Text, HandoutVisibility.KeeperFacing, Now.AddMinutes(1));

        using (var context = _builder.Fixture.CreateContext())
        {
            var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
            Assert.Equal(HandoutOutcome.Accepted, scene!.EditHandout(first, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Renamed", Text).Outcome);
            Assert.Equal(HandoutOutcome.Accepted, scene.EditHandout(second, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "Second", Text).Outcome);
            Assert.Equal(HandoutOrderOutcome.Reordered, scene.ReorderHandouts([second, first]));
            await context.SaveChangesAsync();
        }

        using var verify = _builder.Fixture.CreateContext();
        var stored = (await new EfSceneRepository(verify).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None))!.Handouts;
        Assert.Equal(
            [(second, HandoutKind.ReadAloud, 1), (first, HandoutKind.Text, 2)],
            stored.Select(handout => (handout.Id, handout.Kind, handout.Position)));
        Assert.Equal("Renamed", stored[1].Title);
    }

    [Fact]
    public async Task Given_a_removed_handout_When_saved_Then_its_row_is_deleted()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();
        var removed = await AddAsync(scenarioId, sceneId, "Removed", HandoutKind.Text, HandoutVisibility.KeeperFacing, Now);
        var kept = await AddAsync(scenarioId, sceneId, "Kept", HandoutKind.Text, HandoutVisibility.KeeperFacing, Now.AddMinutes(1));

        using (var context = _builder.Fixture.CreateContext())
        {
            var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
            Assert.Equal(HandoutRemovalOutcome.Removed, scene!.RemoveHandout(removed));
            await context.SaveChangesAsync();
        }

        using var verify = _builder.Fixture.CreateContext();
        var scene2 = await new EfSceneRepository(verify).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
        Assert.Equal(kept, Assert.Single(scene2!.Handouts).Id);
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_handouts_When_it_is_removed_Then_its_handouts_are_deleted()
    {
        var (scenarioId, sceneId) = await CreateSceneAsync();
        await AddAsync(scenarioId, sceneId, "The cellar", HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, Now);
        await AddAsync(scenarioId, sceneId, "The attic", HandoutKind.Text, HandoutVisibility.KeeperFacing, Now.AddMinutes(1));

        using (var context = _builder.Fixture.CreateContext())
        {
            context.Scenes.Remove(await context.Scenes.SingleAsync(scene => scene.Id == sceneId));
            await context.SaveChangesAsync();
        }

        using var verify = _builder.Fixture.CreateContext();
        Assert.Equal(0, await verify.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Handouts").SingleAsync());
    }

    private static Task InsertRawAsync(ScenarioPreparationDbContext context, Guid id, Guid sceneId, DateTimeOffset createdAt) =>
        context.Database.ExecuteSqlRawAsync(
            "INSERT INTO Handouts (Id, SceneId, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES ({0}, {1}, 'Text', 'KeeperFacing', 'x', {2}, 1, {3})",
            id,
            sceneId,
            Text,
            createdAt.UtcDateTime.ToString("yyyy-MM-dd HH:mm:ss"));
}
