namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Linking and unlinking a Scene's Items as the Campaign's Keeper (PBI-SP-008 D4, specs/scenario-preparation/spec.md).
/// The Keeper check runs first, so anyone else, a missing Scene, or a Scene of another Scenario or Campaign ends as NotFound
/// before any Scene is read (ADR 0013, ADR 0016).
/// </summary>
public class ItemLinkServiceTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<ItemLinkWriteResult> LinkAsync(Guid scenarioId, Guid sceneId, Guid? itemId, Guid? campaignId = null, Guid? caller = null, ISceneRepository? repository = null)
    {
        _builder.TimeProvider.Advance(TimeSpan.FromMinutes(1));
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemLinkService(context, repository)
            .LinkAsync(campaignId ?? _builder.CampaignId, caller ?? Keeper, scenarioId, sceneId, itemId, CancellationToken.None);
    }

    private async Task<ItemUnlinkOutcome> UnlinkAsync(Guid scenarioId, Guid sceneId, Guid linkId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateItemLinkService(context).UnlinkAsync(_builder.CampaignId, Keeper, scenarioId, sceneId, linkId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_an_Item_of_the_Campaign_When_linking_it_Then_the_link_names_the_live_Item_and_the_Scene_lists_it()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        var result = await LinkAsync(scenarioId, sceneId, item.Id);

        Assert.Equal(ItemLinkWriteOutcome.Linked, result.Outcome);
        Assert.Equal(new ItemReference(item.Id, "Walter Corbitt's diary"), result.Link!.Item);
        var listed = Assert.Single((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.ItemLinks);
        Assert.Equal(result.Link, listed);
    }

    [Fact]
    public async Task Given_an_Item_already_linked_When_linking_it_again_Then_the_existing_link_is_returned_and_no_second_row_is_stored()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var first = await LinkAsync(scenarioId, sceneId, item.Id);

        var again = await LinkAsync(scenarioId, sceneId, item.Id);

        Assert.Equal(ItemLinkWriteOutcome.AlreadyLinked, again.Outcome);
        Assert.Equal(first.Link, again.Link);
        Assert.Equal(1, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_Item_of_another_Campaign_a_missing_or_an_unknown_id_When_linking_Then_the_Item_is_not_in_the_Campaign()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var foreign = await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId);

        Assert.Equal(ItemLinkWriteOutcome.ItemNotInCampaign, (await LinkAsync(scenarioId, sceneId, foreign.Id)).Outcome);
        Assert.Equal(ItemLinkWriteOutcome.ItemNotInCampaign, (await LinkAsync(scenarioId, sceneId, Guid.NewGuid())).Outcome);
        Assert.Equal(ItemLinkWriteOutcome.ItemNotInCampaign, (await LinkAsync(scenarioId, sceneId, null)).Outcome);
        Assert.Equal(0, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_Finished_Scene_When_linking_Then_it_is_refused_as_finished_even_for_an_Item_outside_the_Campaign()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        Assert.Equal(ItemLinkWriteOutcome.Finished, (await LinkAsync(scenarioId, sceneId, item.Id)).Outcome);
        Assert.Equal(ItemLinkWriteOutcome.Finished, (await LinkAsync(scenarioId, sceneId, Guid.NewGuid())).Outcome);
        Assert.Equal(0, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_linking_Then_the_Item_is_linked()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.Equal(ItemLinkWriteOutcome.Linked, (await LinkAsync(scenarioId, sceneId, item.Id)).Outcome);
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_links_Then_everything_is_NotFound_before_any_Scene_is_read(string caller)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingSceneRepository(new EfSceneRepository(context));
        var directory = new RecordingItemDirectory(new EfItemDirectory(context));
        var service = new ItemLinkService(_builder.Keepers, recording, directory, _builder.TimeProvider);

        var linked = await service.LinkAsync(campaignId, accountId, scenarioId, sceneId, item.Id, CancellationToken.None);
        var unlinked = await service.UnlinkAsync(campaignId, accountId, scenarioId, sceneId, link.Id, CancellationToken.None);

        Assert.Equal(ItemLinkWriteOutcome.NotFound, linked.Outcome);
        Assert.Equal(ItemUnlinkOutcome.NotFound, unlinked);
        Assert.Empty(recording.Calls);
        Assert.Empty(directory.Calls);
        Assert.Equal(1, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_Scene_of_another_Scenario_or_Campaign_When_linking_Then_it_is_NotFound()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var (otherScenarioId, _) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);

        Assert.Equal(ItemLinkWriteOutcome.NotFound, (await LinkAsync(otherScenarioId, sceneId, item.Id)).Outcome);
        Assert.Equal(ItemLinkWriteOutcome.NotFound, (await LinkAsync(scenarioId, sceneId, item.Id, campaignId: _builder.OtherCampaignOfSameKeeperId)).Outcome);
        Assert.Equal(ItemLinkWriteOutcome.NotFound, (await LinkAsync(scenarioId, Guid.NewGuid(), item.Id)).Outcome);
    }

    [Fact]
    public async Task Given_a_link_When_unlinking_Then_the_link_is_removed_and_the_Item_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);

        var outcome = await UnlinkAsync(scenarioId, sceneId, link.Id);

        Assert.Equal(ItemUnlinkOutcome.Unlinked, outcome);
        Assert.Empty((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.ItemLinks);
        Assert.Equal(1, await _builder.StoredItemCountAsync());
    }

    [Fact]
    public async Task Given_an_Active_Scene_When_unlinking_Then_the_link_is_removed()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.Equal(ItemUnlinkOutcome.Unlinked, await UnlinkAsync(scenarioId, sceneId, link.Id));
    }

    [Fact]
    public async Task Given_a_Finished_Scene_When_unlinking_Then_it_is_refused_and_the_link_stays()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var link = await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Finished);

        Assert.Equal(ItemUnlinkOutcome.Finished, await UnlinkAsync(scenarioId, sceneId, link.Id));
        Assert.Equal(1, await _builder.StoredItemLinkCountAsync());
    }

    [Fact]
    public async Task Given_an_unknown_link_id_When_unlinking_Then_it_is_NotFound()
    {
        var (scenarioId, sceneId) = await SceneAsync();

        Assert.Equal(ItemUnlinkOutcome.NotFound, await UnlinkAsync(scenarioId, sceneId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Given_several_linked_Items_When_getting_the_Scene_Then_the_links_are_in_the_order_linked_with_the_live_Item_names()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var diary = await _builder.CreateItemAsync(_builder.CampaignId, "Walter Corbitt's diary");
        var key = await _builder.CreateItemAsync(_builder.CampaignId, "The cellar key");
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, diary.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, key.Id);
        using (var context = _builder.Fixture.CreateContext())
        {
            await _builder.CreateItemService(context).EditAsync(_builder.CampaignId, Keeper, diary.Id, "The diary", ScenarioPreparationTestBuilder.RichText("A diary"), null, CancellationToken.None);
        }

        var scene = await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId);

        Assert.Equal(["The diary", "The cellar key"], scene!.ItemLinks.Select(link => link.Item.Name));
    }
}
