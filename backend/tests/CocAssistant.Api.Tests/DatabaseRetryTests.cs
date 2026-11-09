namespace CocAssistant.Api.Tests;

/// <summary>
/// The hosting retry policy (ADR 0031 amendment, PBI-DEP-002 D1): every DbContext retries transient SQL Server
/// failures with a window of at least 60 seconds, covering a paused free-offer database resume.
/// </summary>
public class DatabaseRetryTests
{
    private sealed class DelayProbingStrategy(DbContext context)
        : SqlServerRetryingExecutionStrategy(context, DatabaseRetryPolicy.MaxRetryCount, DatabaseRetryPolicy.MaxRetryDelay, null)
    {
        public TimeSpan ProbeNextDelay(Exception failure)
        {
            ExceptionsEncountered.Add(failure);
            return GetNextDelay(failure) ?? TimeSpan.Zero;
        }
    }

    [Fact]
    public async Task Given_the_composition_root_When_creating_the_identity_strategy_Then_it_retries_on_failure()
    {
        await using var factory = new CompositionRootTestFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

        var strategy = Assert.IsType<SqlServerRetryingExecutionStrategy>(context.Database.CreateExecutionStrategy());

        Assert.True(strategy.RetriesOnFailure);
    }

    [Fact]
    public async Task Given_the_composition_root_When_creating_the_campaign_play_strategy_Then_it_retries_on_failure()
    {
        await using var factory = new CompositionRootTestFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CampaignPlayDbContext>();

        var strategy = Assert.IsType<SqlServerRetryingExecutionStrategy>(context.Database.CreateExecutionStrategy());

        Assert.True(strategy.RetriesOnFailure);
    }

    [Fact]
    public async Task Given_the_composition_root_When_creating_the_scenario_preparation_strategy_Then_it_retries_on_failure()
    {
        await using var factory = new CompositionRootTestFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ScenarioPreparationDbContext>();

        var strategy = Assert.IsType<SqlServerRetryingExecutionStrategy>(context.Database.CreateExecutionStrategy());

        Assert.True(strategy.RetriesOnFailure);
    }

    [Fact]
    public void Given_the_retry_policy_When_summing_the_backoff_across_all_retries_Then_it_waits_at_least_60_seconds()
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=CocAssistantRetryProbe;Trusted_Connection=True")
            .Options;
        using var context = new IdentityDbContext(options);
        var strategy = new DelayProbingStrategy(context);

        var total = TimeSpan.Zero;
        for (var attempt = 0; attempt < DatabaseRetryPolicy.MaxRetryCount; attempt++)
        {
            total += strategy.ProbeNextDelay(new InvalidOperationException("probe"));
        }

        Assert.True(total >= TimeSpan.FromSeconds(60), $"The retry window was {total}.");
    }
}
