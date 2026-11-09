namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Rolling EDU improvement checks through the Player's use case (specs/character-sheet/spec.md, Creation rolling).</summary>
public class RollMyEduImprovementCheckServiceTests : IDisposable
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
            .RollMyEduImprovementCheckAsync(campaignId, player, CancellationToken.None);
    }

    public void Dispose() => _scenario.Dispose();

    [Fact]
    public async Task Given_a_point_buy_draft_When_rolling_a_check_below_edu_Then_only_the_server_rolled_check_exists()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();

        var result = await RollAsync(campaignId, Player, new ScriptedDiceRoller([30]));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        var records = result.View!.Investigator.CharacterSheet.RollRecords;
        var check = Assert.Single(records, record => record.Purpose == RollPurposes.EduImprovementCheck(1));
        Assert.Equal(RollSource.Server, check.Source);
        Assert.Equal(30, check.Result);
        Assert.Equal(Player, check.RolledByAccountId);
        Assert.DoesNotContain(records, record => record.Purpose == RollPurposes.EduImprovementGain(1));
    }

    [Fact]
    public async Task Given_a_point_buy_draft_When_rolling_a_check_above_edu_Then_the_gain_is_rolled_in_the_same_action()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();

        var result = await RollAsync(campaignId, Player, new ScriptedDiceRoller([70, 4]));

        Assert.Equal(InvestigatorCommandOutcome.Succeeded, result.Outcome);
        var records = result.View!.Investigator.CharacterSheet.RollRecords;
        Assert.Equal(70, Assert.Single(records, record => record.Purpose == RollPurposes.EduImprovementCheck(1)).Result);
        var gain = Assert.Single(records, record => record.Purpose == RollPurposes.EduImprovementGain(1));
        Assert.Equal(RollSource.Server, gain.Source);
        Assert.Equal(4, gain.Result);
        Assert.Equal(Player, gain.RolledByAccountId);
    }

    [Fact]
    public async Task Given_a_rolled_check_When_rolling_again_Then_it_conflicts_and_changes_nothing()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();
        var first = await RollAsync(campaignId, Player, new ScriptedDiceRoller([30]));
        var investigatorId = first.View!.Investigator.Id;

        var second = await RollAsync(campaignId, Player, new ScriptedDiceRoller([30]));

        Assert.Equal(InvestigatorCommandOutcome.StatusConflict, second.Outcome);
        Assert.Equal(
            first.View.Investigator.CharacterSheet,
            (await _scenario.LoadInvestigatorAsync(campaignId, investigatorId))!.CharacterSheet);
    }

    [Fact]
    public async Task Given_another_players_draft_When_rolling_an_edu_check_Then_it_is_not_found()
    {
        var campaignId = await CampaignWithPointBuyDraftAsync();

        var result = await RollAsync(campaignId, CampaignPlayScenario.OtherPlayerAccountId, new ScriptedDiceRoller([30]));

        Assert.Equal(InvestigatorCommandOutcome.NotFound, result.Outcome);
    }
}
