namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Finding the owner of a Handout for its Campaign's Keeper (PBI-SP-008 D3): the Keeper check runs first, then the owner is
/// loaded with one branch per reference type, and an Item owner carries whether the Item is in play (ADR 0022).
/// </summary>
public class HandoutOwnerLocatorTests : IDisposable
{
    private static readonly Guid Keeper = ScenarioPreparationTestBuilder.KeeperAccountId;

    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<IHandoutOwner?> FindAsync(HandoutOwnerReference reference, Guid? campaignId = null, Guid? caller = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHandoutOwnerLocator(context).FindAsync(campaignId ?? _builder.CampaignId, caller ?? Keeper, reference, CancellationToken.None);
    }

    [Fact]
    public async Task Given_a_Scene_reference_When_finding_Then_a_Scene_owner_with_the_Scenes_Handouts_is_returned()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);

        var owner = await FindAsync(new SceneHandoutOwnerReference(scenarioId, sceneId));

        Assert.IsType<SceneHandoutOwner>(owner);
        Assert.Equal(handout.Id, Assert.Single(owner!.Handouts).Id);
    }

    [Fact]
    public async Task Given_an_Item_reference_When_finding_Then_an_Item_owner_with_the_Items_Handouts_is_returned()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        var owner = await FindAsync(new ItemHandoutOwnerReference(item.Id));

        Assert.IsType<ItemHandoutOwner>(owner);
        Assert.Equal(handout.Id, Assert.Single(owner!.Handouts).Id);
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("OtherKeeper")]
    [InlineData("Stranger")]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_finding_Then_null_is_returned_before_any_owner_is_read(string caller)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var (campaignId, accountId) = caller switch
        {
            "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
            "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
            _ => (Guid.NewGuid(), Keeper),
        };
        using var context = _builder.Fixture.CreateContext();
        var scenes = new RecordingSceneRepository(new EfSceneRepository(context));
        var items = new RecordingItemRepository(new EfItemRepository(context));
        var locator = _builder.CreateHandoutOwnerLocator(context, scenes, items);

        Assert.Null(await locator.FindAsync(campaignId, accountId, new SceneHandoutOwnerReference(scenarioId, sceneId), CancellationToken.None));
        Assert.Null(await locator.FindAsync(campaignId, accountId, new ItemHandoutOwnerReference(item.Id), CancellationToken.None));
        Assert.Empty(scenes.Calls);
        Assert.Empty(items.Calls);
        Assert.Empty(_builder.ItemHolders.Calls);
    }

    [Fact]
    public async Task Given_an_Item_or_Scene_of_another_Campaign_or_an_unknown_id_When_finding_Then_null_is_returned()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var foreign = await _builder.CreateItemAsync(_builder.OtherCampaignOfSameKeeperId);

        Assert.Null(await FindAsync(new ItemHandoutOwnerReference(foreign.Id)));
        Assert.Null(await FindAsync(new ItemHandoutOwnerReference(Guid.NewGuid())));
        Assert.Null(await FindAsync(new SceneHandoutOwnerReference(scenarioId, sceneId), _builder.OtherCampaignOfSameKeeperId));
        Assert.Null(await FindAsync(new SceneHandoutOwnerReference(Guid.NewGuid(), sceneId)));
    }

    [Fact]
    public async Task Given_an_Item_linked_only_to_a_Prepared_Scene_and_not_held_When_finding_Then_it_is_not_in_play_so_a_Handout_can_be_removed()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);

        var owner = await FindAsync(new ItemHandoutOwnerReference(item.Id));

        Assert.Equal(HandoutRemovalOutcome.Removed, owner!.RemoveHandout(handout.Id));
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_an_Item_linked_to_a_played_Scene_When_finding_Then_it_is_in_play_so_a_Handout_cannot_be_removed(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        await _builder.LinkItemAsync(_builder.CampaignId, scenarioId, sceneId, item.Id);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        await _builder.PlayAsync(sceneId, status);

        var owner = await FindAsync(new ItemHandoutOwnerReference(item.Id));

        Assert.Equal(HandoutRemovalOutcome.ItemInPlay, owner!.RemoveHandout(handout.Id));
        Assert.Single(owner.Handouts);
    }

    [Fact]
    public async Task Given_a_held_Item_not_linked_to_any_Scene_When_finding_Then_it_is_in_play_so_a_Handout_cannot_be_removed()
    {
        var item = await _builder.CreateItemAsync(_builder.CampaignId);
        var handout = await _builder.AddItemHandoutAsync(_builder.CampaignId, item.Id);
        _builder.ItemHolders.Hold(item.Id, Guid.NewGuid());

        var owner = await FindAsync(new ItemHandoutOwnerReference(item.Id));

        Assert.Equal(HandoutRemovalOutcome.ItemInPlay, owner!.RemoveHandout(handout.Id));
    }

    [Fact]
    public async Task Given_a_Scene_owner_When_removing_a_Handout_Then_only_a_Prepared_Scene_allows_it()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var handout = await _builder.AddHandoutAsync(_builder.CampaignId, scenarioId, sceneId);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        var owner = await FindAsync(new SceneHandoutOwnerReference(scenarioId, sceneId));

        Assert.Equal(HandoutRemovalOutcome.SceneNotPrepared, owner!.RemoveHandout(handout.Id));
    }
}
