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
        scene.StartWithOneInvestigator(now.AddHours(1));
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
    [Fact]
    public async Task Given_a_new_database_When_migrating_to_latest_Then_an_item_is_stored_with_its_handout_and_its_scene_link_and_listed_with_its_scene_count()
    {
        await _dbContext.Database.MigrateAsync();
        var campaignId = Guid.NewGuid();
        var now = new DateTimeOffset(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);
        var scenario = Scenario.Create(campaignId, "The Haunting", null, 1, now).Scenario!;
        var scene = Scene.Create(scenario, "The Corbitt House", null, null, 1, now).Scene!;
        const string text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A diary\"}]}]}}";
        var item = Item.Create(campaignId, "Walter Corbitt's diary", text, null, now).Item!;
        item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "The last entry", text, now);
        scene.LinkItem(item.Id, true, now);
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(scene);
        _dbContext.Items.Add(item);
        await _dbContext.SaveChangesAsync();
        _dbContext.ChangeTracker.Clear();

        var stored = await new EfItemRepository(_dbContext).FindByIdAsync(campaignId, item.Id, CancellationToken.None);
        var listed = await new EfItemDirectory(_dbContext).ListForCampaignAsync(campaignId, CancellationToken.None);

        Assert.Equal(("Walter Corbitt's diary", campaignId), (stored!.Name, stored.CampaignId));
        var handout = Assert.Single(stored.Handouts);
        Assert.Equal((item.Id, (Guid?)null, "The last entry"), (handout.ItemId, handout.SceneId, handout.Title));
        Assert.Equal([new ItemSummary(item.Id, "Walter Corbitt's diary", 1)], listed);
    }

    [Fact]
    public async Task Given_a_new_database_When_inserting_handouts_Then_the_database_refuses_a_row_with_no_owner_or_two_owners()
    {
        await _dbContext.Database.MigrateAsync();
        var scenario = Scenario.Create(Guid.NewGuid(), "The Haunting", null, 1, DateTimeOffset.UtcNow).Scenario!;
        var scene = Scene.Create(scenario, "A", null, null, 1, DateTimeOffset.UtcNow).Scene!;
        var item = Item.Create(scenario.CampaignId, "Key", "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Key\"}]}]}}", null, DateTimeOffset.UtcNow).Item!;
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(scene);
        _dbContext.Items.Add(item);
        await _dbContext.SaveChangesAsync();
        const string insert = "INSERT INTO Handouts (Id, SceneId, ItemId, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES (NEWID(), {0}, {1}, 'Text', 'KeeperFacing', 'x', '{{}}', 1, SYSUTCDATETIME())";
        var noOwner = insert.Replace("{0}", "NULL").Replace("{1}", "NULL");

        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Database.ExecuteSqlRawAsync(noOwner));
        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Database.ExecuteSqlRawAsync(insert, scene.Id, item.Id));
        await _dbContext.Database.ExecuteSqlRawAsync(insert.Replace("{1}", "NULL"), scene.Id);
        await _dbContext.Database.ExecuteSqlRawAsync(insert.Replace("{0}", "NULL").Replace("{1}", "{0}"), item.Id);
        Assert.Equal(2, await _dbContext.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Handouts").SingleAsync());
    }

    [Fact]
    public async Task Given_an_item_with_a_scene_link_and_a_handout_When_deleting_the_item_Then_the_database_cascades_to_both_and_keeps_the_scene()
    {
        await _dbContext.Database.MigrateAsync();
        var now = DateTimeOffset.UtcNow;
        var scenario = Scenario.Create(Guid.NewGuid(), "The Haunting", null, 1, now).Scenario!;
        var scene = Scene.Create(scenario, "A", null, null, 1, now).Scene!;
        const string text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Key\"}]}]}}";
        var item = Item.Create(scenario.CampaignId, "Key", text, null, now).Item!;
        item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "Note", text, now);
        scene.LinkItem(item.Id, true, now);
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(scene);
        _dbContext.Items.Add(item);
        await _dbContext.SaveChangesAsync();

        await _dbContext.Items.ExecuteDeleteAsync();

        Assert.Equal((0, 0, 1), (
            await _dbContext.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM ItemLinks").SingleAsync(),
            await _dbContext.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Handouts").SingleAsync(),
            await _dbContext.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Scenes").SingleAsync()));
    }
}
