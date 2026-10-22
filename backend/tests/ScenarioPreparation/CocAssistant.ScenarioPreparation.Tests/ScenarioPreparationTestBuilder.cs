namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Test setup in domain vocabulary: a Campaign owned by <see cref="KeeperAccountId"/>, another owned by the same Keeper,
/// and a Campaign owned by someone else. Each service call gets a fresh context, as each request does.
/// </summary>
public sealed class ScenarioPreparationTestBuilder : IDisposable
{
    public static readonly Guid KeeperAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    public static readonly Guid PlayerAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    public static readonly Guid OtherKeeperAccountId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");

    public ScenarioPreparationTestBuilder()
    {
        Keepers.Register(CampaignId, KeeperAccountId);
        Keepers.Register(OtherCampaignOfSameKeeperId, KeeperAccountId);
        Keepers.Register(OtherKeepersCampaignId, OtherKeeperAccountId);
    }

    public SqliteScenarioPreparationDbContextFixture Fixture { get; } = new();

    public FakeCampaignKeepers Keepers { get; } = new();

    public FakeTimeProvider TimeProvider { get; } = new(new DateTimeOffset(2026, 10, 16, 12, 0, 0, TimeSpan.Zero));

    public Guid CampaignId { get; } = Guid.NewGuid();

    public Guid OtherCampaignOfSameKeeperId { get; } = Guid.NewGuid();

    public Guid OtherKeepersCampaignId { get; } = Guid.NewGuid();

    public void Dispose() => Fixture.Dispose();

    public ScenarioService CreateService(ScenarioPreparationDbContext context, IScenarioRepository? repository = null) =>
        new(Keepers, repository ?? new EfScenarioRepository(context), TimeProvider);

    public SceneService CreateSceneService(ScenarioPreparationDbContext context, ISceneRepository? repository = null) =>
        new(Keepers, new EfScenarioRepository(context), repository ?? new EfSceneRepository(context), new EfNonPlayerEntityDirectory(context), TimeProvider);

    public NonPlayerEntityLinkService CreateLinkService(ScenarioPreparationDbContext context, ISceneRepository? repository = null) =>
        new(Keepers, repository ?? new EfSceneRepository(context), new EfNonPlayerEntityDirectory(context), TimeProvider);

    public HumanNpcService CreateHumanNpcService(ScenarioPreparationDbContext context, IHumanNpcRepository? repository = null, INonPlayerEntityUsage? usage = null) =>
        new(Keepers, repository ?? new EfHumanNpcRepository(context), usage ?? new EfNonPlayerEntityUsage(context), new FakeNonPlayerEntityRuleData(), TimeProvider);

    public MythosCreatureService CreateMythosCreatureService(ScenarioPreparationDbContext context, IMythosCreatureRepository? repository = null, INonPlayerEntityUsage? usage = null) =>
        new(Keepers, repository ?? new EfMythosCreatureRepository(context), usage ?? new EfNonPlayerEntityUsage(context), new FakeNonPlayerEntityRuleData(), TimeProvider);

    public NonPlayerEntityService CreateNonPlayerEntityService(ScenarioPreparationDbContext context, INonPlayerEntityDirectory? directory = null) =>
        new(Keepers, directory ?? new EfNonPlayerEntityDirectory(context));

    /// <summary>Creates a Human NPC as the Keeper and returns its view.</summary>
    public async Task<HumanNpcView> CreateHumanNpcAsync(Guid campaignId, string name = "Mr. Knott", int age = 62)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateHumanNpcService(context).CreateAsync(campaignId, KeeperAccountId, name, age, CancellationToken.None);
        Assert.Equal(HumanNpcWriteOutcome.Saved, result.Outcome);
        return result.HumanNpc!;
    }

    /// <summary>Creates a Mythos Creature as the Keeper and returns its view.</summary>
    public async Task<MythosCreatureView> CreateMythosCreatureAsync(Guid campaignId, string name = "Ghoul")
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateMythosCreatureService(context).CreateAsync(campaignId, KeeperAccountId, name, CancellationToken.None);
        Assert.Equal(MythosCreatureWriteOutcome.Saved, result.Outcome);
        return result.MythosCreature!;
    }

    public async Task<int> StoredMythosCreatureCountAsync()
    {
        using var context = Fixture.CreateContext();
        return await context.MythosCreatures.CountAsync();
    }

    public async Task<int> StoredHumanNpcCountAsync()
    {
        using var context = Fixture.CreateContext();
        return await context.HumanNpcs.CountAsync();
    }

    /// <summary>Creates a Scene as the Keeper one minute after the previous call and returns its view.</summary>
    public async Task<SceneDetailView> CreateSceneAsync(Guid campaignId, Guid scenarioId, string title, string? location = null, string? keeperNotes = null)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateSceneService(context).CreateAsync(campaignId, KeeperAccountId, scenarioId, title, location, keeperNotes, CancellationToken.None);
        Assert.Equal(SceneWriteOutcome.Saved, result.Outcome);
        return result.Scene!;
    }

    /// <summary>Links a Non-Player Entity to a Scene as the Keeper one minute after the previous call and returns the link.</summary>
    public async Task<NonPlayerEntityLinkView> LinkAsync(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        NonPlayerEntityType type,
        Guid nonPlayerEntityId,
        string playerFacingName = "A shape in the cellar",
        string? playerFacingDescription = null)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateLinkService(context).LinkAsync(
            campaignId, KeeperAccountId, scenarioId, sceneId, type, nonPlayerEntityId, playerFacingName, playerFacingDescription, CancellationToken.None);
        Assert.Equal(NonPlayerEntityLinkWriteOutcome.Saved, result.Outcome);
        return result.Link!;
    }

    public async Task<SceneDetailView?> GetSceneAsync(Guid campaignId, Guid scenarioId, Guid sceneId, Guid? callerAccountId = null)
    {
        using var context = Fixture.CreateContext();
        return await CreateSceneService(context).GetAsync(campaignId, callerAccountId ?? KeeperAccountId, scenarioId, sceneId, CancellationToken.None);
    }

    public async Task<int> StoredLinkCountAsync()
    {
        using var context = Fixture.CreateContext();
        return await context.NonPlayerEntityLinks.CountAsync();
    }

    public async Task<IReadOnlyList<SceneSummaryView>?> ListScenesAsync(Guid campaignId, Guid scenarioId, Guid callerAccountId)
    {
        using var context = Fixture.CreateContext();
        return await CreateSceneService(context).ListAsync(campaignId, callerAccountId, scenarioId, CancellationToken.None);
    }

    /// <summary>Plays a stored Scene to the given status through the domain transitions, as Scene Play will.</summary>
    public async Task PlayAsync(Guid sceneId, SceneStatus status)
    {
        using var context = Fixture.CreateContext();
        var scene = await context.Scenes.SingleAsync(candidate => candidate.Id == sceneId);
        if (status >= SceneStatus.Active)
        {
            scene.Start(TimeProvider.GetUtcNow());
        }

        if (status == SceneStatus.Finished)
        {
            scene.Finish(TimeProvider.GetUtcNow().AddMinutes(30));
        }

        await context.SaveChangesAsync();
    }

    /// <summary>The stored (Title, Position) pairs of a Scenario's Scenes, ordered by Title.</summary>
    public async Task<IReadOnlyList<(string Title, int Position)>> StoredScenePositionsAsync(Guid scenarioId)
    {
        using var context = Fixture.CreateContext();
        var scenes = await context.Scenes.Where(scene => scene.ScenarioId == scenarioId).ToListAsync();
        return scenes.OrderBy(scene => scene.Title, StringComparer.Ordinal).Select(scene => (scene.Title, scene.Position)).ToList();
    }

    /// <summary>Creates a Scenario as the Keeper one minute after the previous call and returns its view.</summary>
    public async Task<ScenarioView> CreateScenarioAsync(Guid campaignId, string title, string? keeperNotes = null)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateService(context).CreateAsync(campaignId, KeeperAccountId, title, keeperNotes, CancellationToken.None);
        Assert.Equal(ScenarioWriteOutcome.Saved, result.Outcome);
        return result.Scenario!;
    }

    public async Task<IReadOnlyList<ScenarioView>?> ListAsync(Guid campaignId, Guid callerAccountId)
    {
        using var context = Fixture.CreateContext();
        return await CreateService(context).ListAsync(campaignId, callerAccountId, CancellationToken.None);
    }

    /// <summary>The stored (Title, Position) pairs of a Campaign's Scenarios, ordered by Title.</summary>
    public async Task<IReadOnlyList<(string Title, int Position)>> StoredPositionsAsync(Guid campaignId)
    {
        using var context = Fixture.CreateContext();
        var scenarios = await context.Scenarios.Where(scenario => scenario.CampaignId == campaignId).ToListAsync();
        return scenarios.OrderBy(scenario => scenario.Title, StringComparer.Ordinal).Select(scenario => (scenario.Title, scenario.Position)).ToList();
    }
}
