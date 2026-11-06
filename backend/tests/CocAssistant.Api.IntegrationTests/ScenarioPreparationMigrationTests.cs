namespace CocAssistant.Api.IntegrationTests;

/// <summary>Verifies the Scenario Preparation migrations against SQL Server in a database of its own.</summary>
public class ScenarioPreparationMigrationTests : IAsyncLifetime
{
    private static readonly string ConnectionString =
        SqlServerTestConnection.ForDatabase("CocAssistantScenarioPreparationMigrationTests");

    private ScenarioPreparationDbContext _dbContext = null!;
    private DbContextOptions<ScenarioPreparationDbContext> _options = null!;

    public async Task InitializeAsync()
    {
        _options = new DbContextOptionsBuilder<ScenarioPreparationDbContext>()
            .UseSqlServer(ConnectionString, sql => sql.MigrationsHistoryTable("__ScenarioPreparationMigrationsHistory"))
            .Options;
        _dbContext = new ScenarioPreparationDbContext(_options);
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
    public async Task Given_a_new_database_When_migrating_to_latest_Then_a_given_item_is_stored_with_its_holder_and_give_reveal()
    {
        var (itemId, holderId, revealId) = await GiveAsync();

        var stored = await new EfItemRepository(_dbContext).FindByIdAsync(CampaignId, itemId, CancellationToken.None);
        var held = await new EfItemRepository(_dbContext).ListHeldAsync(CampaignId, holderId, CancellationToken.None);

        Assert.Equal((holderId, revealId), (stored!.HolderInvestigatorId, stored.HolderRevealId));
        var entry = Assert.Single(held);
        Assert.Equal((itemId, revealId), (entry.Item.Id, entry.GiveReveal.Id));
    }

    [Fact]
    public async Task Given_a_new_database_When_inserting_items_Then_the_database_refuses_a_holder_without_its_give_reveal_and_vice_versa()
    {
        await _dbContext.Database.MigrateAsync();
        var campaignId = Guid.NewGuid();
        var holderId = Guid.NewGuid();
        const string columns = "INSERT INTO Items (Id, CampaignId, Name, PlayerFacingDescription, CreatedAt, {0}) VALUES (NEWID(), {1}, 'Key', 'A key', SYSUTCDATETIME(), {2})";
        var holderWithoutReveal = string.Format(columns, "HolderInvestigatorId", "{0}", "{1}");
        var revealWithoutHolder = string.Format(columns, "HolderRevealId", "{0}", "NEWID()");

        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Database.ExecuteSqlRawAsync(holderWithoutReveal, campaignId, holderId));
        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Database.ExecuteSqlRawAsync(revealWithoutHolder, campaignId));
        await _dbContext.Database.ExecuteSqlRawAsync(
            "INSERT INTO Items (Id, CampaignId, Name, PlayerFacingDescription, CreatedAt) VALUES (NEWID(), {0}, 'Key', 'A key', SYSUTCDATETIME())",
            campaignId);
        Assert.Equal(1, await _dbContext.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM Items").SingleAsync());
    }

    [Fact]
    public async Task Given_a_held_item_When_deleting_its_give_reveal_Then_the_database_refuses()
    {
        var (itemId, _, _) = await GiveAsync();

        await Assert.ThrowsAsync<SqlException>(() => _dbContext.Set<Reveal>().ExecuteDeleteAsync());

        var stored = await new EfItemRepository(_dbContext).FindByIdAsync(CampaignId, itemId, CancellationToken.None);
        Assert.NotNull(stored!.HolderInvestigatorId);
    }

    [Fact]
    public async Task Given_an_item_updated_concurrently_When_saving_Then_the_second_save_fails()
    {
        var seed = await SeedAsync();
        using var other = new ScenarioPreparationDbContext(_options);
        var stale = await other.Items.SingleAsync(candidate => candidate.Id == seed.ItemId);
        var revealId = await GiveOnAsync(_dbContext, seed.SceneId, seed.ItemId, seed.HolderId);
        Assert.NotEqual(Guid.Empty, revealId);
        stale.Edit("Map", Text, null);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => other.SaveChangesAsync());
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

    private static readonly Guid CampaignId = Guid.NewGuid();

    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A key\"}]}]}}";

    private async Task<(Guid ItemId, Guid HolderId, Guid RevealId)> GiveAsync()
    {
        var seed = await SeedAsync();
        var revealId = await GiveOnAsync(_dbContext, seed.SceneId, seed.ItemId, seed.HolderId);
        return (seed.ItemId, seed.HolderId, revealId);
    }

    private async Task<(Guid SceneId, Guid ItemId, Guid HolderId)> SeedAsync()
    {
        await _dbContext.Database.MigrateAsync();
        var now = DateTimeOffset.UtcNow;
        var holderId = Guid.NewGuid();
        var scenario = Scenario.Create(CampaignId, "The Haunting", null, 1, now).Scenario!;
        var scene = Scene.Create(scenario, "The Corbitt House", null, null, 1, now).Scene!;
        var item = Item.Create(CampaignId, "Key", Text, null, now).Item!;
        scene.LinkItem(item.Id, true, now);
        _dbContext.Scenarios.Add(scenario);
        _dbContext.Scenes.Add(scene);
        _dbContext.Items.Add(item);
        await _dbContext.SaveChangesAsync();
        _dbContext.ChangeTracker.Clear();

        return (scene.Id, item.Id, holderId);
    }

    private async Task<Guid> GiveOnAsync(ScenarioPreparationDbContext context, Guid sceneId, Guid itemId, Guid holderId)
    {
        var now = DateTimeOffset.UtcNow;
        var play = (await new EfSceneRepository(context).FindForPlayAsync(CampaignId, sceneId, CancellationToken.None))!;
        Assert.Equal(SceneTransitionOutcome.Transitioned, play.Start(now, [holderId], [holderId]));
        var held = await context.Items.SingleAsync(candidate => candidate.Id == itemId);
        var give = play.GiveItem(held, holderId, now);
        Assert.Equal(CocAssistant.ScenarioPreparation.Domain.GiveItemOutcome.Given, give.Outcome);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        return give.Reveal!.Id;
    }
}
