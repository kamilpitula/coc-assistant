namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Whether an Item is linked to an Active or Finished Scene of its Campaign, and which Scenes link it (PBI-SP-008, ADR 0022).</summary>
public class ItemUsageTests : IDisposable
{
    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<bool> IsLinkedAsync(Guid campaignId, Guid itemId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new EfItemUsage(context).IsLinkedToPlayedSceneAsync(campaignId, itemId, CancellationToken.None);
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_a_played_Scene_When_asking_Then_it_is_in_use(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, status);

        Assert.True(await IsLinkedAsync(_builder.CampaignId, item.Id));
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_or_to_none_When_asking_Then_it_is_not_in_use()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var linked = await _builder.CreateItemAsync(_builder.CampaignId, "Linked");
        var free = await _builder.CreateItemAsync(_builder.CampaignId, "Free");
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, linked.Id);

        Assert.False(await IsLinkedAsync(_builder.CampaignId, linked.Id));
        Assert.False(await IsLinkedAsync(_builder.CampaignId, free.Id));
    }

    [Fact]
    public async Task Given_an_Item_linked_to_a_Prepared_and_an_Active_Scene_When_asking_Then_it_is_in_use()
    {
        var (scenarioId, preparedScene) = await SceneAsync();
        var activeScene = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "Second")).Id;
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, preparedScene, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, activeScene, item.Id);
        await _builder.PlayAsync(activeScene, SceneStatus.Active);

        Assert.True(await IsLinkedAsync(_builder.CampaignId, item.Id));
    }

    [Fact]
    public async Task Given_a_played_Scene_with_another_Item_When_asking_about_an_unlinked_Item_Then_it_is_not_in_use()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var linked = await _builder.CreateItemAsync(_builder.CampaignId, "Linked");
        var free = await _builder.CreateItemAsync(_builder.CampaignId, "Free");
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, linked.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.False(await IsLinkedAsync(_builder.CampaignId, free.Id));
    }

    [Fact]
    public async Task Given_another_Campaign_id_When_asking_Then_a_played_link_is_not_counted()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.False(await IsLinkedAsync(_builder.OtherCampaignOfSameKeeperId, item.Id));
    }

    [Fact]
    public async Task Given_an_Item_linked_to_Scenes_of_two_Scenarios_When_listing_Then_the_Scenes_follow_Scenario_then_Scene_order_with_their_status()
    {
        var (secondScenario, secondScene) = await SceneAsync();
        var firstScenario = (await _builder.CreateScenarioAsync(_builder.CampaignId, "Edge of Darkness")).Id;
        var firstScene = (await _builder.CreateSceneAsync(_builder.CampaignId, firstScenario, "Arkham")).Id;
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, secondScenario, secondScene, item.Id);
        await _builder.LinkItemAsync(_builder.CampaignId, firstScenario, firstScene, item.Id);
        await _builder.PlayAsync(firstScene, SceneStatus.Active);

        using var context = _builder.Fixture.CreateContext();
        var scenes = await new EfItemUsage(context).ListLinkedScenesAsync(_builder.CampaignId, item.Id, CancellationToken.None);

        Assert.Equal(
            [
                new ItemScene(secondScenario, "The Haunting", secondScene, "The Corbitt House", SceneStatus.Prepared),
                new ItemScene(firstScenario, "Edge of Darkness", firstScene, "Arkham", SceneStatus.Active),
            ],
            scenes);
    }
}
