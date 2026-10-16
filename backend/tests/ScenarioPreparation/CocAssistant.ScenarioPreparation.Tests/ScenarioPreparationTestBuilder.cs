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
