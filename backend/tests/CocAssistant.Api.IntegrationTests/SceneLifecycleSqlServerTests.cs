namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// The Scene lifecycle against SQL Server (ADR 0025): the one-Active-Scene index and the finish-then-start transaction behave
/// the same whether the Active Scene's id sorts before or after the new Scene's id, and concurrent starts leave one Active Scene.
/// </summary>
public class SceneLifecycleSqlServerTests : IClassFixture<IdentityApiFactory>, IAsyncLifetime
{
    private static readonly Guid Harvey = ScenePlaySeed.Harvey;

    private readonly IdentityApiFactory _factory;

    public SceneLifecycleSqlServerTests(IdentityApiFactory factory) => _factory = factory;

    public Task InitializeAsync() => ResetDatabaseAsync(_factory);

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<(Guid CampaignId, List<Guid> SceneIds)> SeedScenesAsync(int count)
    {
        var campaignId = Guid.NewGuid();
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        var scenario = Scenario.Create(campaignId, "The Haunting", null, 1, DateTimeOffset.UtcNow).Scenario!;
        dbContext.Scenarios.Add(scenario);
        var scenes = Enumerable.Range(1, count).Select(index => Scene.Create(scenario, $"Scene {index}", null, null, index, DateTimeOffset.UtcNow).Scene!).ToList();
        dbContext.Scenes.AddRange(scenes);
        await dbContext.SaveChangesAsync();
        return (campaignId, scenes.Select(scene => scene.Id).Order().ToList());
    }

    private async Task<SceneStartResult> StartAsync(Guid campaignId, Guid sceneId, bool finishActiveScene)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<SceneLifecycleService>()
            .StartAsync(campaignId, sceneId, [Harvey], [Harvey], finishActiveScene, CancellationToken.None);
    }

    private async Task<Dictionary<Guid, SceneStatus>> StatusesAsync(Guid campaignId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();
        return await dbContext.Scenes.AsNoTracking().Where(scene => scene.CampaignId == campaignId).ToDictionaryAsync(scene => scene.Id, scene => scene.Status);
    }

    [Fact]
    public async Task Given_the_active_scene_id_sorts_before_and_then_after_the_new_scene_id_When_finishing_and_starting_Then_both_succeed_and_one_scene_is_active()
    {
        var (campaignId, ids) = await SeedScenesAsync(3);

        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(campaignId, ids[0], false)).Outcome);
        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(campaignId, ids[2], true)).Outcome);
        Assert.Equal(SceneStartOutcome.Started, (await StartAsync(campaignId, ids[1], true)).Outcome);

        var statuses = await StatusesAsync(campaignId);
        Assert.Equal((SceneStatus.Finished, SceneStatus.Active, SceneStatus.Finished), (statuses[ids[0]], statuses[ids[1]], statuses[ids[2]]));
    }

    [Fact]
    public async Task Given_two_different_scenes_started_at_the_same_time_When_both_save_Then_exactly_one_is_active()
    {
        var (campaignId, ids) = await SeedScenesAsync(2);

        var results = await Task.WhenAll(StartAsync(campaignId, ids[0], false), StartAsync(campaignId, ids[1], false));

        Assert.Equal(1, results.Count(result => result.Outcome == SceneStartOutcome.Started));
        Assert.All(results.Where(result => result.Outcome != SceneStartOutcome.Started), result => Assert.Contains(result.Outcome, new[] { SceneStartOutcome.Conflict, SceneStartOutcome.ActiveSceneExists }));
        Assert.Equal(1, (await StatusesAsync(campaignId)).Values.Count(status => status == SceneStatus.Active));
    }

    [Fact]
    public async Task Given_the_same_scene_started_at_the_same_time_with_the_same_present_list_When_both_save_Then_exactly_one_wins()
    {
        var (campaignId, ids) = await SeedScenesAsync(1);

        var results = await Task.WhenAll(StartAsync(campaignId, ids[0], false), StartAsync(campaignId, ids[0], false));

        Assert.Equal(1, results.Count(result => result.Outcome == SceneStartOutcome.Started));
        Assert.All(results.Where(result => result.Outcome != SceneStartOutcome.Started), result => Assert.Contains(result.Outcome, new[] { SceneStartOutcome.Conflict, SceneStartOutcome.NotPrepared }));
    }
}
