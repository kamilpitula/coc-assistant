namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Storing Scene links: insertion through the Scene, the database cascades, and the one-entity check (ADR 0019).</summary>
public class NonPlayerEntityLinkPersistenceTests : IDisposable
{
    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A shape\"}]}]}}";

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private static readonly DateTimeOffset Now = new(2026, 10, 21, 12, 0, 0, TimeSpan.Zero);

    private async Task<Guid> CreateSceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id;
    }

    private async Task<Guid> LinkAsync(Guid sceneId, NonPlayerEntityType type, Guid entityId, string name = "A shape")
    {
        using var context = _builder.Fixture.CreateContext();
        var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, await ScenarioIdOfAsync(context, sceneId), sceneId, CancellationToken.None);
        var link = scene!.LinkNonPlayerEntity(type, entityId, true, name, Description, Now).Link!;
        await context.SaveChangesAsync();
        return link.Id;
    }

    private static Task<Guid> ScenarioIdOfAsync(ScenarioPreparationDbContext context, Guid sceneId) =>
        context.Scenes.Where(scene => scene.Id == sceneId).Select(scene => scene.ScenarioId).SingleAsync();

    private async Task<int> StoredLinkCountAsync()
    {
        using var context = _builder.Fixture.CreateContext();
        return await context.NonPlayerEntityLinks.CountAsync();
    }

    [Fact]
    public async Task Given_a_link_added_to_a_tracked_scene_When_saved_Then_it_is_inserted_and_read_back_with_the_scene()
    {
        var sceneId = await CreateSceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);

        var linkId = await LinkAsync(sceneId, NonPlayerEntityType.HumanNpc, human.Id);

        using var context = _builder.Fixture.CreateContext();
        var scenarioId = await ScenarioIdOfAsync(context, sceneId);
        var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
        var link = Assert.Single(scene!.NonPlayerEntityLinks);
        Assert.Equal((linkId, NonPlayerEntityType.HumanNpc, human.Id, "A shape", Description, Now), (link.Id, link.Type, link.NonPlayerEntityId, link.PlayerFacingName, link.PlayerFacingDescription, link.CreatedAt));
    }

    [Fact]
    public async Task Given_a_stored_link_When_editing_and_unlinking_it_Then_the_changes_are_saved()
    {
        var sceneId = await CreateSceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        var kept = await LinkAsync(sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "Kept");
        var removed = await LinkAsync(sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "Removed");

        using (var context = _builder.Fixture.CreateContext())
        {
            var scene = await context.Scenes.Include(candidate => candidate.NonPlayerEntityLinks).SingleAsync(candidate => candidate.Id == sceneId);
            Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, scene.EditNonPlayerEntityLink(kept, "Renamed", null).Outcome);
            Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, scene.UnlinkNonPlayerEntity(removed));
            await context.SaveChangesAsync();
        }

        using var verify = _builder.Fixture.CreateContext();
        var stored = Assert.Single(await verify.NonPlayerEntityLinks.ToListAsync());
        Assert.Equal((kept, "Renamed", null), (stored.Id, stored.PlayerFacingName, stored.PlayerFacingDescription));
    }

    [Fact]
    public async Task Given_a_prepared_scene_with_links_When_it_is_removed_Then_its_links_are_deleted()
    {
        var sceneId = await CreateSceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await LinkAsync(sceneId, NonPlayerEntityType.HumanNpc, human.Id);

        using (var context = _builder.Fixture.CreateContext())
        {
            context.Scenes.Remove(await context.Scenes.SingleAsync(scene => scene.Id == sceneId));
            await context.SaveChangesAsync();
        }

        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_human_npc_with_links_When_it_is_deleted_Then_only_its_links_are_deleted()
    {
        var sceneId = await CreateSceneAsync();
        var doomed = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Doomed");
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await LinkAsync(sceneId, NonPlayerEntityType.HumanNpc, doomed.Id);
        var surviving = await LinkAsync(sceneId, NonPlayerEntityType.MythosCreature, creature.Id);

        using (var context = _builder.Fixture.CreateContext())
        {
            context.HumanNpcs.Remove(await context.HumanNpcs.SingleAsync(human => human.Id == doomed.Id));
            await context.SaveChangesAsync();
        }

        using var verify = _builder.Fixture.CreateContext();
        Assert.Equal(surviving, Assert.Single(await verify.NonPlayerEntityLinks.ToListAsync()).Id);
    }

    [Fact]
    public async Task Given_a_mythos_creature_with_links_When_it_is_deleted_Then_its_links_are_deleted()
    {
        var sceneId = await CreateSceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await LinkAsync(sceneId, NonPlayerEntityType.MythosCreature, creature.Id);
        await LinkAsync(sceneId, NonPlayerEntityType.MythosCreature, creature.Id, "Twice");

        using (var context = _builder.Fixture.CreateContext())
        {
            context.MythosCreatures.Remove(await context.MythosCreatures.SingleAsync(candidate => candidate.Id == creature.Id));
            await context.SaveChangesAsync();
        }

        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_link_row_with_no_entity_or_with_two_When_inserted_Then_the_check_constraint_rejects_it()
    {
        var sceneId = await CreateSceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => InsertRawAsync(context, sceneId, null, null));
        await Assert.ThrowsAnyAsync<DbUpdateException>(() => InsertRawAsync(context, sceneId, human.Id, creature.Id));
        Assert.Equal(0, await StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_link_row_to_an_unknown_entity_When_inserted_Then_the_foreign_key_rejects_it()
    {
        var sceneId = await CreateSceneAsync();
        using var context = _builder.Fixture.CreateContext();

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => InsertRawAsync(context, sceneId, Guid.NewGuid(), null));
    }

    private static async Task InsertRawAsync(ScenarioPreparationDbContext context, Guid sceneId, Guid? humanNpcId, Guid? mythosCreatureId)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "INSERT INTO NonPlayerEntityLinks (Id, SceneId, HumanNpcId, MythosCreatureId, PlayerFacingName, CreatedAt) VALUES ({0}, {1}, {2}, {3}, 'x', '2026-10-21 12:00:00')",
                Guid.NewGuid(),
                sceneId,
                (object?)humanNpcId ?? DBNull.Value,
                (object?)mythosCreatureId ?? DBNull.Value);
        }
        catch (Exception exception) when (exception is not DbUpdateException)
        {
            throw new DbUpdateException(exception.Message, exception);
        }
    }
}
