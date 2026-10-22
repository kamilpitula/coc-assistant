namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Whether a Non-Player Entity is linked to an Active or Finished Scene of its Campaign (spec.md, DELETE 409).</summary>
public class NonPlayerEntityUsageTests : IDisposable
{
    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<bool> IsLinkedAsync(Guid campaignId, NonPlayerEntityType type, Guid id)
    {
        using var context = _builder.Fixture.CreateContext();
        return await new EfNonPlayerEntityUsage(context).IsLinkedToPlayedSceneAsync(campaignId, type, id, CancellationToken.None);
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_a_human_npc_linked_to_a_played_scene_When_asking_Then_it_is_in_use(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        await _builder.PlayAsync(sceneId, status);

        Assert.True(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.HumanNpc, human.Id));
    }

    [Fact]
    public async Task Given_a_mythos_creature_linked_to_an_active_scene_When_asking_Then_it_is_in_use()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var creature = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, creature.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.True(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.MythosCreature, creature.Id));
    }

    [Fact]
    public async Task Given_an_entity_linked_only_to_prepared_scenes_When_asking_Then_it_is_not_in_use()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);

        Assert.False(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.HumanNpc, human.Id));
    }

    [Fact]
    public async Task Given_an_entity_linked_to_a_prepared_and_an_active_scene_When_asking_Then_it_is_in_use()
    {
        var (scenarioId, preparedId) = await SceneAsync();
        var activeId = (await _builder.CreateSceneAsync(_builder.CampaignId, scenarioId, "Second")).Id;
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, preparedId, NonPlayerEntityType.HumanNpc, human.Id);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, activeId, NonPlayerEntityType.HumanNpc, human.Id);
        await _builder.PlayAsync(activeId, SceneStatus.Active);

        Assert.True(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.HumanNpc, human.Id));
    }

    [Fact]
    public async Task Given_an_unlinked_entity_and_a_played_scene_with_another_link_When_asking_Then_it_is_not_in_use()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var linked = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Linked");
        var free = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Free");
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, linked.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.False(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.HumanNpc, free.Id));
    }

    [Fact]
    public async Task Given_the_other_type_or_another_campaign_When_asking_Then_a_played_link_does_not_count()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.HumanNpc, human.Id);
        await _builder.PlayAsync(sceneId, SceneStatus.Active);

        Assert.False(await IsLinkedAsync(_builder.CampaignId, NonPlayerEntityType.MythosCreature, human.Id));
        Assert.False(await IsLinkedAsync(_builder.OtherCampaignOfSameKeeperId, NonPlayerEntityType.HumanNpc, human.Id));
    }
}
