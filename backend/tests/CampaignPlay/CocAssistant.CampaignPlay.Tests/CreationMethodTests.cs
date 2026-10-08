namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Characteristic generation per Creation Method (docs/game-rules/coc7_character_creation_and_development_rules.md
/// sections 2.1 and 2.3). Expected values are worked by hand from those sections.
/// </summary>
public class CreationMethodTests
{
    [Theory]
    [InlineData(Characteristic.Strength, 11, 55)]
    [InlineData(Characteristic.Power, 3, 15)]
    [InlineData(Characteristic.Size, 7, 65)]
    [InlineData(Characteristic.Education, 12, 90)]
    public void Section_2_1_Given_a_raw_dice_total_When_rolling_a_characteristic_Then_the_value_follows_its_formula(
        Characteristic characteristic, int rawTotal, int expected)
    {
        var values = StandardRolling.ValuesFrom(CharacteristicValues.Empty.With(characteristic, rawTotal));

        Assert.Equal(expected, values[characteristic]);
    }

    [Fact]
    public void Section_2_1_Given_a_characteristic_without_a_roll_When_rolling_Then_it_has_no_value()
    {
        var values = StandardRolling.ValuesFrom(CharacteristicValues.Empty.With(Characteristic.Strength, 11));

        Assert.Null(values[Characteristic.Size]);
    }

    [Theory]
    [InlineData(Characteristic.Dexterity, "3D6")]
    [InlineData(Characteristic.Intelligence, "2D6")]
    public void Section_2_1_Given_a_characteristic_When_reading_its_formula_Then_it_names_the_dice_rolled(Characteristic characteristic, string dice)
    {
        Assert.Equal(dice, StandardRolling.FormulaFor(characteristic).Dice.ToString());
    }
}
