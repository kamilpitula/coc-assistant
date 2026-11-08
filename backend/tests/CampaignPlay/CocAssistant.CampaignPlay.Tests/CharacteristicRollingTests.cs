namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Server-side Standard Rolling (docs/game-rules/coc7_character_creation_and_development_rules.md section 2.1):
/// the app rolls every characteristic missing a Roll Record with its section 2.1 dice.
/// </summary>
public class CharacteristicRollingTests
{
    private static readonly Guid Roller = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);

    private static CharacterSheet BlankStandardRollingSheet() =>
        new CharacterSheetBuilder()
            .WithCreationMethod(CreationMethod.StandardRolling)
            .WithLuckRolls()
            .WithEduImprovementChecks()
            .Build();

    [Fact]
    public void Section_2_1_Given_a_sheet_with_no_characteristic_rolls_When_rolling_the_missing_Then_each_uses_its_dice_and_keeps_the_raw_total()
    {
        // STR CON DEX APP POW 3D6; SIZ INT EDU 2D6.
        var faces = new[] { 2, 5, 6, 1, 1, 1, 1, 1, 2, 6, 6, 6, 4, 4, 4, 3, 3, 4, 4, 1, 1 };
        var sheet = BlankStandardRollingSheet();

        var records = CharacteristicRolling.RollMissing(sheet, new ScriptedDiceRoller(faces), Roller, Now);

        Assert.Equal(
            [
                RollRecord.FromServer("Characteristic:STR", new DiceRoll("3D6", [2, 5, 6], 13), Roller, Now),
                RollRecord.FromServer("Characteristic:CON", new DiceRoll("3D6", [1, 1, 1], 3), Roller, Now),
                RollRecord.FromServer("Characteristic:DEX", new DiceRoll("3D6", [1, 1, 2], 4), Roller, Now),
                RollRecord.FromServer("Characteristic:APP", new DiceRoll("3D6", [6, 6, 6], 18), Roller, Now),
                RollRecord.FromServer("Characteristic:POW", new DiceRoll("3D6", [4, 4, 4], 12), Roller, Now),
                RollRecord.FromServer("Characteristic:SIZ", new DiceRoll("2D6", [3, 3], 6), Roller, Now),
                RollRecord.FromServer("Characteristic:INT", new DiceRoll("2D6", [4, 4], 8), Roller, Now),
                RollRecord.FromServer("Characteristic:EDU", new DiceRoll("2D6", [1, 1], 2), Roller, Now),
            ],
            records);
    }

    [Fact]
    public void Given_a_player_entered_record_When_rolling_the_missing_Then_that_characteristic_is_skipped()
    {
        var sheet = new CharacterSheetBuilder()
            .WithCharacteristicRolls(new Dictionary<Characteristic, int?> { [Characteristic.Strength] = 12 })
            .WithLuckRolls()
            .WithEduImprovementChecks()
            .Build();
        var faces = new[] { 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 };

        var records = CharacteristicRolling.RollMissing(sheet, new ScriptedDiceRoller(faces), Roller, Now);

        Assert.Equal(7, records.Count);
        Assert.DoesNotContain(records, record => record.Purpose == "Characteristic:STR");
        Assert.All(records, record => Assert.Equal(RollSource.Server, record.Source));
    }
}
