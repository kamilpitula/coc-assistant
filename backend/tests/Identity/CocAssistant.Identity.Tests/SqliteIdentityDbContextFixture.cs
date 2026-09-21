namespace CocAssistant.Identity.Tests;

/// <summary>Opens an in-memory SQLite connection per test so the EF Core model is exercised against a real provider.</summary>
public sealed class SqliteIdentityDbContextFixture : IDisposable
{
    private readonly SqliteConnection _connection;

    public SqliteIdentityDbContextFixture()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        using var dbContext = CreateContext();
        dbContext.Database.EnsureCreated();
    }

    public IdentityDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new IdentityDbContext(options);
    }

    public IAccountRepository CreateRepository(IdentityDbContext dbContext) => new EfAccountRepository(dbContext);

    public void Dispose() => _connection.Dispose();
}
