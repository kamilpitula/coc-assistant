namespace CocAssistant.Api.IntegrationTests;

/// <summary>Verifies the Scenario Preparation migrations against SQL Server in a database of its own.</summary>
public class ScenarioPreparationMigrationTests : IAsyncLifetime
{
    private static readonly string ConnectionString =
        SqlServerTestConnection.ForDatabase("CocAssistantScenarioPreparationMigrationTests");

    private ScenarioPreparationDbContext _dbContext = null!;

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<ScenarioPreparationDbContext>()
            .UseSqlServer(ConnectionString, sql => sql.MigrationsHistoryTable("__ScenarioPreparationMigrationsHistory"))
            .Options;
        _dbContext = new ScenarioPreparationDbContext(options);
        await _dbContext.Database.EnsureDeletedAsync();
    }

    public async Task DisposeAsync() => await _dbContext.DisposeAsync();

    [Fact]
    public void Given_the_current_model_When_compared_with_the_migrations_Then_no_model_change_is_pending()
    {
        Assert.False(_dbContext.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task Given_a_new_database_When_migrating_to_latest_Then_scenarios_are_stored_without_a_campaign_row()
    {
        await _dbContext.Database.MigrateAsync();

        _dbContext.Scenarios.Add(Scenario.Create(Guid.NewGuid(), "The Haunting", "Notes", 1, DateTimeOffset.UtcNow).Scenario!);
        await _dbContext.SaveChangesAsync();

        Assert.Equal(1, await _dbContext.Scenarios.CountAsync());
    }
}
