namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Storing Items, their Scene links and their Handouts (PBI-SP-008 D2, D5; ADR 0020, ADR 0022): the one-owner check on
/// Handouts, the cascades, and the unique link per Scene and Item.
/// </summary>
public class ItemPersistenceTests : IDisposable
{
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);
    private static readonly string Text = ScenarioPreparationTestBuilder.RichText("The last entry");

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<int> CountAsync(string table)
    {
        using var context = _builder.Fixture.CreateContext();
        return await context.Database.SqlQueryRaw<int>($"SELECT COUNT(*) AS Value FROM {table}").SingleAsync();
    }

    [Fact]
    public async Task Given_an_Item_with_Handouts_When_saved_and_read_back_Then_the_fields_and_the_Handouts_round_trip()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId, "Walter Corbitt's diary", ScenarioPreparationTestBuilder.RichText("A diary"), ScenarioPreparationTestBuilder.RichText("Torn page"));
        var first = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "First");
        var second = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id, "Second");

        using var context = _builder.Fixture.CreateContext();
        var stored = await new EfItemRepository(context).FindByIdAsync(_builder.CampaignId, item.Id, CancellationToken.None);

        Assert.Equal(
            (item.Id, _builder.CampaignId, "Walter Corbitt's diary", ScenarioPreparationTestBuilder.RichText("A diary"), ScenarioPreparationTestBuilder.RichText("Torn page")),
            (stored!.Id, stored.CampaignId, stored.Name, stored.PlayerFacingDescription, stored.KeeperNotes));
        Assert.Equal([first.Id, second.Id], stored.Handouts.Select(handout => handout.Id));
        Assert.All(stored.Handouts, handout => Assert.Equal((item.Id, (Guid?)null), (handout.ItemId, handout.SceneId)));
    }

    [Fact]
    public async Task Given_an_Item_of_another_Campaign_When_finding_it_Then_it_is_not_found()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        using var context = _builder.Fixture.CreateContext();
        var repository = new EfItemRepository(context);

        Assert.Null(await repository.FindByIdAsync(_builder.OtherCampaignOfSameKeeperId, item.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_Handout_rows_with_no_owner_or_two_owners_When_inserting_Then_the_check_constraint_refuses_them()
    {
        var (_, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();

        var noOwner = () => context.Database.ExecuteSqlRawAsync(
            "INSERT INTO Handouts (Id, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES ({0}, 'Text', 'KeeperFacing', 'x', {1}, 1, '2026-10-23 12:00:00')",
            Guid.NewGuid(),
            Text);
        var twoOwners = () => context.Database.ExecuteSqlRawAsync(
            "INSERT INTO Handouts (Id, SceneId, ItemId, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES ({0}, {1}, {2}, 'Text', 'KeeperFacing', 'x', {3}, 1, '2026-10-23 12:00:00')",
            Guid.NewGuid(),
            sceneId,
            item.Id,
            Text);

        await Assert.ThrowsAnyAsync<Exception>(noOwner);
        await Assert.ThrowsAnyAsync<Exception>(twoOwners);
        Assert.Equal(0, await CountAsync("Handouts"));
    }

    [Fact]
    public async Task Given_a_Handout_row_with_exactly_one_owner_When_inserting_Then_it_is_accepted_for_a_Scene_and_for_an_Item()
    {
        var (_, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        using var context = _builder.Fixture.CreateContext();

        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO Handouts (Id, SceneId, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES ({0}, {1}, 'Text', 'KeeperFacing', 'x', {2}, 1, '2026-10-23 12:00:00')",
            Guid.NewGuid(),
            sceneId,
            Text);
        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO Handouts (Id, ItemId, Kind, Visibility, Title, Content, Position, CreatedAt) VALUES ({0}, {1}, 'Text', 'KeeperFacing', 'x', {2}, 1, '2026-10-23 12:00:00')",
            Guid.NewGuid(),
            item.Id,
            Text);

        Assert.Equal(2, await CountAsync("Handouts"));
    }

    [Fact]
    public async Task Given_an_Item_with_links_and_Handouts_When_it_is_deleted_Then_its_links_and_Handouts_go_and_the_Scene_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        using (var context = _builder.Fixture.CreateContext())
        {
            context.Items.Remove(await context.Items.SingleAsync(candidate => candidate.Id == item.Id));
            await context.SaveChangesAsync();
        }

        Assert.Equal((0, 0, 1, 1), (await CountAsync("Items"), await CountAsync("ItemLinks"), await CountAsync("Handouts"), await CountAsync("Scenes")));
    }

    [Fact]
    public async Task Given_a_Prepared_Scene_with_Item_links_When_it_is_removed_Then_its_links_go_and_the_Item_and_its_Handouts_stay()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        using (var context = _builder.Fixture.CreateContext())
        {
            var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);
            new EfSceneRepository(context).Remove(scene!);
            await context.SaveChangesAsync();
        }

        Assert.Equal((0, 1, 0, 1), (await CountAsync("ItemLinks"), await CountAsync("Items"), await CountAsync("Scenes"), await CountAsync("Handouts")));
    }

    [Fact]
    public async Task Given_an_Item_linked_to_a_Scene_When_inserting_a_second_link_row_Then_the_unique_index_refuses_it()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        using var context = _builder.Fixture.CreateContext();

        var duplicate = () => context.Database.ExecuteSqlRawAsync(
            "INSERT INTO ItemLinks (Id, SceneId, ItemId, CreatedAt) VALUES ({0}, {1}, {2}, '2026-10-23 12:00:00')",
            Guid.NewGuid(),
            sceneId,
            item.Id);

        await Assert.ThrowsAnyAsync<Exception>(duplicate);
        Assert.Equal(1, await CountAsync("ItemLinks"));
    }

    [Fact]
    public async Task Given_an_Item_linked_to_two_Scenes_When_the_second_link_is_inserted_Then_it_is_accepted()
    {
        var (scenarioId, firstScene) = await SceneAsync();
        var secondScene = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "The attic")).Id;
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, firstScene, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, secondScene, item.Id);

        Assert.Equal(2, await CountAsync("ItemLinks"));
    }

    [Fact]
    public async Task Given_an_Item_link_When_reading_the_Scene_Then_the_link_is_loaded_with_its_fields()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);

        using var context = _builder.Fixture.CreateContext();
        var scene = await new EfSceneRepository(context).FindByIdAsync(_builder.CampaignId, scenarioId, sceneId, CancellationToken.None);

        var stored = Assert.Single(scene!.ItemLinks);
        Assert.Equal((link.Id, sceneId, item.Id), (stored.Id, stored.SceneId, stored.ItemId));
        Assert.Equal(_builder.TimeProvider.GetUtcNow(), stored.CreatedAt);
    }
}
