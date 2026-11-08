namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Rolling characteristics through the Player's use case (specs/character-sheet/spec.md, Creation rolling).</summary>
public class RollMyCharacteristicsServiceTests : IDisposable
{
    private static readonly Guid Player = CampaignPlayScenario.PlayerAccountId;
    private readonly CampaignPlayScenario _scenario = new();

    private async Task<Guid> CampaignWithStandardRollingDraftAsync(IDiceRoller roller)
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        await _scenario.CreateDraftAsync(campaignId, Player);
        using var context = _scenario.Fixture.CreateContext();
        var inputs = new CharacterSheetBuilder()
            .WithCreationMethod(CreationMethod.StandardRolling)
            .WithLuckRolls()
            .WithEduImprovementChecks()
            .BuildInputs();
        await _scenario.PlayerService(context, roller: roller)
            .ReplaceMyCharacterSheetAsync(campaignId, Player, inputs, CancellationToken.None);
        return campaignId;
    }

    private async Task<CharacterSheetResult> RollAsync(Guid campaignId, Guid player, IDiceRoller roller)
    {
        using var context = _scenario.Fixture.CreateContext();
        return await _scenario.PlayerService(context, roller: roller)
            .RollMyCharacteristicsAsync(campaignId, player, CancellationToken.None);
    }

    public void Dispose() => _scenario.Dispose();

    [Fact]
    public async Task Given_a_standard_rolling_draft_When_rolling_characteristics_Then_all_eight_are_server_rolled_by_the_caller()
    {
        var campaignId = await CampaignWithStandardRollingDraftAsync(new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        var result = await RollAsync(campaignId, Player, new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        var records = result.View!.Investigator.CharacterSheet.RollRecords;
        Assert.Equal(8, records.Count);
        Assert.All(records, record =>
        {
            Assert.Equal(RollSource.Server, record.Source);
            Assert.Equal(Player, record.RolledByAccountId);
            Assert.Equal(_scenario.TimeProvider.GetUtcNow(), record.RolledAt);
        });
        Assert.Equal("Ada Lovelace", result.View.RolledByDisplayNames[Player]);
    }

    [Fact]
    public async Task Given_rolled_characteristics_When_rolling_again_Then_it_conflicts_and_changes_nothing()
    {
        var campaignId = await CampaignWithStandardRollingDraftAsync(new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));
        var first = await RollAsync(campaignId, Player, new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));
        var investigatorId = first.View!.Investigator.Id;

        var second = await RollAsync(campaignId, Player, new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, second.Outcome);
        Assert.Equal(
            first.View.Investigator.CharacterSheet,
            (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.CharacterSheet);
    }

    [Fact]
    public async Task Given_a_point_buy_draft_When_rolling_characteristics_Then_it_conflicts()
    {
        var campaignId = await _scenario.CreateCampaignAsync();
        await _scenario.JoinAsPlayerAsync(campaignId, Player);
        await _scenario.CreateDraftAsync(campaignId, Player);

        var result = await RollAsync(campaignId, Player, new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, result.Outcome);
    }

    [Fact]
    public async Task Given_another_players_draft_When_rolling_characteristics_Then_it_is_not_found()
    {
        var campaignId = await CampaignWithStandardRollingDraftAsync(new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        var result = await RollAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, new ScriptedDiceRoller(Enumerable.Repeat(3, 21)));

        Assert.Equal(InvestigatorCommandOutcome.NotFound, result.Outcome);
    }
}
