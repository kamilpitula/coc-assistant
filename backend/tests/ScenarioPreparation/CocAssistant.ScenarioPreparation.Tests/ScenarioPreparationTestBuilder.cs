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

    public FakeHandoutFileStore FileStore { get; } = new();

    public FakeItemHolders ItemHolders { get; } = new();

    public RecordingLogger<ItemService> ItemLogger { get; } = new();

    public RecordingLogger<HandoutService> HandoutLogger { get; } = new();

    public RecordingLogger<HandoutFileService> HandoutFileLogger { get; } = new();

    public RecordingLogger<SceneService> SceneLogger { get; } = new();

    public FakeTimeProvider TimeProvider { get; } = new(new DateTimeOffset(2026, 10, 16, 12, 0, 0, TimeSpan.Zero));

    public Guid CampaignId { get; } = Guid.NewGuid();

    public Guid OtherCampaignOfSameKeeperId { get; } = Guid.NewGuid();

    public Guid OtherKeepersCampaignId { get; } = Guid.NewGuid();

    public void Dispose() => Fixture.Dispose();

    public ScenarioService CreateService(ScenarioPreparationDbContext context, IScenarioRepository? repository = null) =>
        new(Keepers, repository ?? new EfScenarioRepository(context), TimeProvider);

    public SceneService CreateSceneService(ScenarioPreparationDbContext context, ISceneRepository? repository = null) =>
        new(Keepers, new EfScenarioRepository(context), repository ?? new EfSceneRepository(context), new EfNonPlayerEntityDirectory(context), new EfItemDirectory(context), FileStore, TimeProvider, SceneLogger);

    public static LinkedSceneGuard CreateLinkedSceneGuard(ScenarioPreparationDbContext context, ISceneRepository? scenes = null) =>
        new(scenes ?? new EfSceneRepository(context));

    public SceneLifecycleService CreateLifecycleService(ScenarioPreparationDbContext context, ISceneRepository? scenes = null) =>
        new(scenes ?? new EfSceneRepository(context), new EfScenarioRepository(context), TimeProvider);

    public NonPlayerEntityLinkService CreateLinkService(ScenarioPreparationDbContext context, ISceneRepository? repository = null) =>
        new(Keepers, repository ?? new EfSceneRepository(context), new EfNonPlayerEntityDirectory(context), TimeProvider);

    public ItemLinkService CreateItemLinkService(ScenarioPreparationDbContext context, ISceneRepository? repository = null) =>
        new(Keepers, repository ?? new EfSceneRepository(context), new EfItemDirectory(context), TimeProvider);

    public ItemService CreateItemService(ScenarioPreparationDbContext context, IItemRepository? repository = null, IItemUsage? usage = null, IItemHolders? holders = null) =>
        new(Keepers, repository ?? new EfItemRepository(context), new EfItemDirectory(context), usage ?? new EfItemUsage(context), holders ?? ItemHolders, CreateLinkedSceneGuard(context), FileStore, TimeProvider, ItemLogger);

    public HandoutOwnerLocator CreateHandoutOwnerLocator(ScenarioPreparationDbContext context, ISceneRepository? scenes = null, IItemRepository? items = null) =>
        new(Keepers, scenes ?? new EfSceneRepository(context), items ?? new EfItemRepository(context), new EfItemUsage(context), ItemHolders);

    public HandoutService CreateHandoutService(ScenarioPreparationDbContext context, ISceneRepository? repository = null, IItemRepository? items = null) =>
        new(CreateHandoutOwnerLocator(context, repository, items), FileStore, TimeProvider, HandoutLogger);

    public HandoutFileService CreateHandoutFileService(ScenarioPreparationDbContext context, ISceneRepository? repository = null, IItemRepository? items = null) =>
        new(CreateHandoutOwnerLocator(context, repository, items), FileStore, TimeProvider, HandoutFileLogger);

    public HumanNpcService CreateHumanNpcService(ScenarioPreparationDbContext context, IHumanNpcRepository? repository = null, INonPlayerEntityUsage? usage = null) =>
        new(Keepers, repository ?? new EfHumanNpcRepository(context), usage ?? new EfNonPlayerEntityUsage(context), CreateLinkedSceneGuard(context), new FakeNonPlayerEntityRuleData(), TimeProvider);

    public MythosCreatureService CreateMythosCreatureService(ScenarioPreparationDbContext context, IMythosCreatureRepository? repository = null, INonPlayerEntityUsage? usage = null) =>
        new(Keepers, repository ?? new EfMythosCreatureRepository(context), usage ?? new EfNonPlayerEntityUsage(context), CreateLinkedSceneGuard(context), new FakeNonPlayerEntityRuleData(), TimeProvider);

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

    /// <summary>Adds a Handout to a Scene as the Keeper one minute after the previous call and returns it.</summary>
    public async Task<HandoutView> AddHandoutAsync(
        Guid campaignId,
        Guid scenarioId,
        Guid sceneId,
        string title = "The cellar",
        HandoutKind kind = HandoutKind.ReadAloud,
        HandoutVisibility visibility = HandoutVisibility.PlayerFacing,
        string content = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}")
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateHandoutService(context).CreateAsync(campaignId, KeeperAccountId, new SceneHandoutOwnerReference(scenarioId, sceneId), kind, visibility, title, content, CancellationToken.None);
        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        return result.Handout!;
    }

    /// <summary>Creates an Item as the Keeper one minute after the previous call and returns its view.</summary>
    public async Task<ItemView> CreateItemAsync(
        Guid campaignId,
        string name = "Walter Corbitt's diary",
        string? description = null,
        string? keeperNotes = null)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateItemService(context).CreateAsync(campaignId, KeeperAccountId, name, description ?? RichText("A leather diary"), keeperNotes, CancellationToken.None);
        Assert.Equal(ItemWriteOutcome.Saved, result.Outcome);
        return result.Item!;
    }

    /// <summary>Links an Item to a Scene as the Keeper one minute after the previous call and returns the link.</summary>
    public async Task<ItemLinkView> LinkItemAsync(Guid campaignId, Guid scenarioId, Guid sceneId, Guid itemId)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateItemLinkService(context).LinkAsync(campaignId, KeeperAccountId, scenarioId, sceneId, itemId, CancellationToken.None);
        Assert.Equal(ItemLinkWriteOutcome.Linked, result.Outcome);
        return result.Link!;
    }

    /// <summary>Adds a rich-text Handout to an Item as the Keeper one minute after the previous call and returns it.</summary>
    public async Task<HandoutView> AddItemHandoutAsync(Guid campaignId, Guid itemId, string title = "The last entry", HandoutKind kind = HandoutKind.Text)
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = Fixture.CreateContext();
        var result = await CreateHandoutService(context).CreateAsync(
            campaignId, KeeperAccountId, new ItemHandoutOwnerReference(itemId), kind, HandoutVisibility.PlayerFacing, title, RichText("The last entry"), CancellationToken.None);
        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        return result.Handout!;
    }

    /// <summary>Adds a PNG Image Handout to an Item as the Keeper and returns it with the blob key that was stored.</summary>
    public async Task<(HandoutView Handout, string Key)> AddItemImageHandoutAsync(Guid campaignId, Guid itemId, string title = "A photograph")
    {
        TimeProvider.Advance(TimeSpan.FromMinutes(1));
        var png = HandoutFileSamples.Png();
        var knownKeys = FileStore.StoredKeys.ToHashSet();
        using var context = Fixture.CreateContext();
        var result = await CreateHandoutFileService(context).CreateAsync(
            campaignId, KeeperAccountId, new ItemHandoutOwnerReference(itemId), HandoutKind.Image, HandoutVisibility.PlayerFacing, title,
            new HandoutUpload("photo.png", png.Length, new MemoryStream(png)), CancellationToken.None);
        Assert.Equal(HandoutWriteOutcome.Saved, result.Outcome);
        return (result.Handout!, FileStore.StoredKeys.Single(key => !knownKeys.Contains(key)));
    }

    public async Task<ItemView?> GetItemAsync(Guid campaignId, Guid itemId, Guid? callerAccountId = null)
    {
        using var context = Fixture.CreateContext();
        return await CreateItemService(context).GetAsync(campaignId, callerAccountId ?? KeeperAccountId, itemId, CancellationToken.None);
    }

    public async Task<int> StoredItemCountAsync()
    {
        using var context = Fixture.CreateContext();
        return await context.Items.CountAsync();
    }

    public async Task<int> StoredItemLinkCountAsync()
    {
        using var context = Fixture.CreateContext();
        return await context.ItemLinks.CountAsync();
    }

    /// <summary>A Lexical document with one paragraph holding the text.</summary>
    public static string RichText(string text) =>
        "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"" + text + "\"}]}]}}";

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
            scene.StartWithOneInvestigator(TimeProvider.GetUtcNow());
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
