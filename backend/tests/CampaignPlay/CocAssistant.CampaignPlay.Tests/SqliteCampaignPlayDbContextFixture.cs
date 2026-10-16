namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Opens an in-memory SQLite connection per test so the EF Core model is exercised against a real provider.</summary>
public sealed class SqliteCampaignPlayDbContextFixture : IDisposable
{
    private readonly SqliteConnection _connection;

    public SqliteCampaignPlayDbContextFixture()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        using var dbContext = CreateContext();
        dbContext.Database.EnsureCreated();
    }

    public CampaignPlayDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<CampaignPlayDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new CampaignPlayDbContext(options);
    }

    /// <summary>Creates a context that dispatches domain events after commit, as the assembled API does.</summary>
    public CampaignPlayDbContext CreateContext(IDomainEventDispatcher dispatcher)
    {
        var options = new DbContextOptionsBuilder<CampaignPlayDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new DomainEventDispatchInterceptor(dispatcher))
            .Options;
        return new CampaignPlayDbContext(options);
    }

    public ICampaignRepository CreateRepository(CampaignPlayDbContext dbContext) => new EfCampaignRepository(dbContext);

    public IWallEntryRepository CreateWallEntryRepository(CampaignPlayDbContext dbContext) => new EfWallEntryRepository(dbContext);

    public IInvestigatorRepository CreateInvestigatorRepository(CampaignPlayDbContext dbContext) => new EfInvestigatorRepository(dbContext);

    public void Dispose() => _connection.Dispose();
}
