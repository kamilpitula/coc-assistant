namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Rolling Luck through the Player's use case (specs/character-sheet/spec.md, Creation rolling).</summary>
public class RollMyLuckServiceTests : IDisposable
{
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private readonly CampaignPlayScenario _scenario = new();

    private async Task<Guid> CampaignWithPointBuyDraftAsync()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        await _scenario.CreateDraftAsync(campaignId, Player);
        await _scenario.SaveCharacterSheetAsync(campaignId, Player, new CharacterSheetBuilder().BuildInputs());
        return campaignId;
    }

    private async Task<CharacterSheetResult> RollAsync(Guid campaignId, Guid player, IDiceRoller roller)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await _scenario.PlayerService(context, roller: roller)
            .RollMyLuckAsync(campaignId, player, CancellationToken.None);
    }

    public void Dispose() => _scenario.Dispose();

    [Fact]
    public async Task Given_a_point_buy_draft_When_rolling_luck_Then_the_server_rolled_record_is_by_the_caller()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();

        var result = await RollAsync(campaignId, Player, new ScriptedDiceRoller([4, 5, 6]));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        var record = Assert.Single(
            result.View!.Investigator.CharacterSheet.RollRecords,
            record => record.Purpose == RollPurposes.Luck);
        Assert.Equal(RollSource.Server, record.Source);
        Assert.Equal([4, 5, 6], record.Faces);
        Assert.Equal(15, record.Result);
        Assert.Equal(Player, record.RolledByAccountId);
        Assert.Equal(_scenario.TimeProvider.GetUtcNow(), record.RolledAt);
        Assert.Equal("Ada Lovelace", result.View.RolledByDisplayNames[Player]);
    }

    [Fact]
    public async Task Given_a_rolled_luck_When_rolling_again_Then_it_conflicts_and_changes_nothing()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();
        var first = await RollAsync(campaignId, Player, new ScriptedDiceRoller([4, 5, 6]));
        var investigatorId = first.View!.Investigator.Id;

        var second = await RollAsync(campaignId, Player, new ScriptedDiceRoller([1, 1, 1]));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, second.Outcome);
        Assert.Equal(
            first.View.Investigator.CharacterSheet,
            (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.CharacterSheet);
    }

    [Fact]
    public async Task Given_another_players_draft_When_rolling_luck_Then_it_is_not_found()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();

        var result = await RollAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, new ScriptedDiceRoller([4, 5, 6]));

        Assert.Equal(InvestigatorCommandOutcome.NotFound, result.Outcome);
    }
}
