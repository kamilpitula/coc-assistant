namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The Keeper's Non-Player Entity list (specs/scenario-preparation/spec.md, Keeper finds a profile in the list).</summary>
public class NonPlayerEntityServiceTests : IDisposable
{
    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<IReadOnlyList<NonPlayerEntitySummary>?> ListAsync(Guid campaignId, Guid callerAccountId, INonPlayerEntityDirectory? directory = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateNonPlayerEntityService(context, directory).ListAsync(campaignId, callerAccountId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_Human_NPCs_in_two_Campaigns_When_the_Keeper_lists_Then_only_this_Campaigns_come_back_by_name()
    {
        await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott");
        await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Desk sergeant");
        await _builder.CreateHumanNpcAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");

        var items = await ListAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId);

        Assert.Equal(
            [("Desk sergeant", NonPlayerEntityType.HumanNpc), ("Mr. Knott", NonPlayerEntityType.HumanNpc)],
            items!.Select(item => (item.Name, item.Type)));
    }

    [Fact]
    public async Task Given_both_types_in_two_Campaigns_When_the_Keeper_lists_Then_this_Campaigns_Human_NPCs_and_Mythos_Creatures_come_back_by_name()
    {
        await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott");
        await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Deep One");
        await _builder.CreateMythosCreatureAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");

        var items = await ListAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId);

        Assert.Equal(
            [("Deep One", NonPlayerEntityType.MythosCreature), ("Ghoul", NonPlayerEntityType.MythosCreature), ("Mr. Knott", NonPlayerEntityType.HumanNpc)],
            items!.Select(item => (item.Name, item.Type)));
    }

    [Fact]
    public async Task Given_a_Campaign_without_Non_Player_Entities_When_the_Keeper_lists_Then_the_list_is_empty()
    {
        Assert.Empty((await ListAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId))!);
    }

    [Fact]
    public async Task Given_a_Player_or_another_Keeper_When_listing_Then_the_result_is_null_and_no_entity_is_read()
    {
        await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var recording = new RecordingNonPlayerEntityDirectory(null!);

        var player = await ListAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId, recording);
        var otherKeeper = await ListAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId, recording);

        Assert.Null(player);
        Assert.Null(otherKeeper);
        Assert.Empty(recording.Calls);
    }
}
