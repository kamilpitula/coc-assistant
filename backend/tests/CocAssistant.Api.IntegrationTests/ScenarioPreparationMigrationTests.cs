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

    [Fact]
    public async Task Given_a_new_database_When_migrating_to_latest_Then_scenes_are_stored_with_their_dates_notes_and_status()
    {
        await _dbContext.Database.MigrateAsync();
        var scenario = Scenario.Create(Guid.NewGuid(), "The Haunting", null, 1, DateTimeOffset.UtcNow).Scenario!;
        var now = new DateTimeOffset(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);
        var scene = Scene.Create(scenario, "The Corbitt House", "Arkham", "{\"root\":{\"type\":\"root\",\"children\":[]}}", 1, now).Scene!;
        scene.Start(now.AddHours(1));
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(scene);
        await _dbContext.SaveChangesAsync();
        _dbContext.ChangeTracker.Clear();

        var stored = await _dbContext.Scenes.SingleAsync();

        Assert.Equal((scenario.CampaignId, scenario.Id, SceneStatus.Active, now.AddHours(1), (DateTimeOffset?)null), (stored.CampaignId, stored.ScenarioId, stored.Status, stored.StartedAt, stored.FinishedAt));
        Assert.Equal("{\"root\":{\"type\":\"root\",\"children\":[]}}", stored.KeeperNotes);
    }

    [Fact]
    public async Task Given_a_new_database_When_migrating_to_latest_Then_a_mythos_creature_is_stored_with_its_monster_profile_and_listed_beside_human_npcs()
    {
        await _dbContext.Database.MigrateAsync();
        var campaignId = Guid.NewGuid();
        var creature = MythosCreature.Create(campaignId, "Ghoul", DateTimeOffset.UtcNow).MythosCreature!;
        Assert.Empty(creature.Edit("Ghoul", MonsterProfile.Empty with
        {
            Characteristics = new MonsterCharacteristics(
                new Dictionary<string, int?> { ["STR"] = 80 },
                false,
                MonsterOverrides.None with { HitPoints = new NumberOverride(25, "Swollen") }),
            SanityLoss = new MonsterSanityLoss("0/1D6"),
        }));
        _dbContext.MythosCreatures.Add(creature);
        _dbContext.HumanNpcs.Add(HumanNpc.Create(campaignId, "Mr. Knott", 62, DateTimeOffset.UtcNow).HumanNpc!);
        await _dbContext.SaveChangesAsync();
        _dbContext.ChangeTracker.Clear();

        var stored = await _dbContext.MythosCreatures.SingleAsync();
        var listed = await new EfNonPlayerEntityDirectory(_dbContext).ListForCampaignAsync(campaignId, CancellationToken.None);

        Assert.Equal(("Ghoul", campaignId, "0/1D6"), (stored.Name, stored.CampaignId, stored.Profile.SanityLoss!.Value));
        Assert.Equal(new NumberOverride(25, "Swollen"), stored.Profile.Characteristics!.Overrides.HitPoints);
        Assert.Equal([("Ghoul", NonPlayerEntityType.MythosCreature), ("Mr. Knott", NonPlayerEntityType.HumanNpc)], listed.Select(item => (item.Name, item.Type)));
    }

    [Fact]
    public async Task Given_a_scenario_with_scenes_When_deleting_the_scenario_Then_the_database_refuses()
    {
        await _dbContext.Database.MigrateAsync();
        var scenario = Scenario.Create(Guid.NewGuid(), "The Haunting", null, 1, DateTimeOffset.UtcNow).Scenario!;
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(Scene.Create(scenario, "A", null, null, 1, DateTimeOffset.UtcNow).Scene!);
        await _dbContext.SaveChangesAsync();

        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Scenarios.ExecuteDeleteAsync());
    }
}
