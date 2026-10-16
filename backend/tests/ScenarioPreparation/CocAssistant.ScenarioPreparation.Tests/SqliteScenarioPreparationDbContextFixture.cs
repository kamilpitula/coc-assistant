namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Opens an in-memory SQLite connection per test so the EF Core model is exercised against a real provider.</summary>
public sealed class SqliteScenarioPreparationDbContextFixture : IDisposable
{
    private readonly SqliteConnection _connection;

    public SqliteScenarioPreparationDbContextFixture()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        using var dbContext = CreateContext();
        dbContext.Database.EnsureCreated();
    }

    public ScenarioPreparationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ScenarioPreparationDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new ScenarioPreparationDbContext(options);
    }

    public void Dispose() => _connection.Dispose();
}
