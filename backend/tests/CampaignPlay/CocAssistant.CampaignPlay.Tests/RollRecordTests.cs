namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Player-entered dice results become Roll Records (docs/game-rules/project_ruleset.md section 4.3;
/// specs/character-sheet/spec.md, Roll Records).
/// </summary>
public class RollRecordTests
{
    [Theory]
    [InlineData("3D6", 3, 18)]
    [InlineData("D100", 1, 100)]
    [InlineData("1D10", 1, 10)]
    public void Given_a_dice_expression_When_reading_its_range_Then_it_spans_the_results_the_dice_can_produce(string notation, int minimum, int maximum)
    {
        var dice = DiceExpression.Parse(notation);

        Assert.Equal(minimum, dice.Minimum);
        Assert.Equal(maximum, dice.Maximum);
        Assert.Equal(notation, dice.ToString());
    }

    [Fact]
    public void Given_a_player_entered_result_When_recording_it_Then_the_roll_record_keeps_the_raw_result_and_its_source()
    {
        var record = new PlayerEnteredRollSource().Record(RollPurposes.Luck, CreationDice.Luck, 11);

        Assert.Equal(new RollRecord("Luck", "3D6", 11, RollSource.PlayerEntered), record);
    }

    [Fact]
    public void Given_no_player_entered_result_When_recording_it_Then_there_is_no_roll_record()
    {
        Assert.Null(new PlayerEnteredRollSource().Record(RollPurposes.Luck, CreationDice.Luck, null));
    }

    [Fact]
    public void Given_player_inputs_with_dice_results_When_building_the_character_sheet_Then_each_result_is_a_roll_record_with_its_purpose()
    {
        var inputs = new CharacterSheetInputs(
            InvestigatorIdentity.Empty,
            CreationMethod.PointBuy,
            CharacteristicValues.Empty,
            CharacteristicValues.Empty.With(Characteristic.Strength, 3),
            [new EduImprovementCheckInput(70, 4), new EduImprovementCheckInput(null, null), new EduImprovementCheckInput(20, null)],
            [11, 13]);

        var sheet = inputs.ToCharacterSheet(new PlayerEnteredRollSource());

        Assert.Equal(
            [
                new RollRecord("Luck", "3D6", 11, RollSource.PlayerEntered),
                new RollRecord("Luck:SecondRoll", "3D6", 13, RollSource.PlayerEntered),
                new RollRecord("EduImprovement[1].Check", "D100", 70, RollSource.PlayerEntered),
                new RollRecord("EduImprovement[1].Gain", "1D10", 4, RollSource.PlayerEntered),
                new RollRecord("EduImprovement[3].Check", "D100", 20, RollSource.PlayerEntered),
            ],
            sheet.RollRecords);
        Assert.Equal(3, sheet.AgeDeductions[Characteristic.Strength]);
    }

    [Fact]
    public void Given_a_character_sheet_with_roll_records_When_reading_its_dice_inputs_Then_they_come_back_in_order_with_gaps()
    {
        var inputs = new CharacterSheetInputs(
            InvestigatorIdentity.Empty,
            CreationMethod.PointBuy,
            CharacteristicValues.Empty,
            CharacteristicValues.Empty,
            [new EduImprovementCheckInput(70, 4), new EduImprovementCheckInput(null, null), new EduImprovementCheckInput(20, null)],
            [11]);

        var sheet = inputs.ToCharacterSheet(new PlayerEnteredRollSource());

        Assert.Equal([11], sheet.LuckRolls);
        Assert.Equal(
            [new EduImprovementCheckInput(70, 4), new EduImprovementCheckInput(null, null), new EduImprovementCheckInput(20, null)],
            sheet.EduImprovementChecks);
    }
}
