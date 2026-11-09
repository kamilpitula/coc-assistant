namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Server-side Luck rolling (docs/game-rules/coc7_character_creation_and_development_rules.md sections 3.1 and 5.5):
/// one action rolls Luck and, when the age bracket rolls twice, the second Luck roll; purposes that already have a
/// Roll Record are kept.
/// </summary>
public class LuckRollingTests
{
    private static readonly Guid Roller = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 9, 12, 0, 0, TimeSpan.Zero);

    private static AgeBracket BracketFor(int age) => TestRules.Creation.AgeRules.BracketFor(age)!;

    private static CharacterSheet SheetWith(params RollRecord[] records) =>
        CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.PointBuy,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            RollRecords = records,
        };

    [Fact]
    public void Section_5_5_Given_a_sheet_with_no_luck_rolls_When_rolling_the_missing_Then_luck_is_server_rolled()
    {
        var records = LuckRolling.RollMissing(SheetWith(), BracketFor(25), new ScriptedDiceRoller([2, 5, 6]), Roller, Now);

        Assert.Equal(
            [RollRecord.FromServer(RollPurposes.Luck, new DiceRoll("3D6", [2, 5, 6], 13), Roller, Now)],
            records);
    }

    [Fact]
    public void Section_5_5_Given_a_two_roll_bracket_When_rolling_the_missing_Then_both_luck_rolls_are_server_rolled()
    {
        var records = LuckRolling.RollMissing(SheetWith(), BracketFor(17), new ScriptedDiceRoller([2, 5, 6, 1, 1, 1]), Roller, Now);

        Assert.Equal(
            [
                RollRecord.FromServer(RollPurposes.Luck, new DiceRoll("3D6", [2, 5, 6], 13), Roller, Now),
                RollRecord.FromServer(RollPurposes.LuckSecondRoll, new DiceRoll("3D6", [1, 1, 1], 3), Roller, Now),
            ],
            records);
    }

    [Fact]
    public void Given_a_legacy_first_luck_roll_When_rolling_the_missing_Then_only_the_second_roll_is_server_rolled()
    {
        var sheet = SheetWith(RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11));

        var records = LuckRolling.RollMissing(sheet, BracketFor(17), new ScriptedDiceRoller([1, 1, 1]), Roller, Now);

        Assert.Equal(
            [RollRecord.FromServer(RollPurposes.LuckSecondRoll, new DiceRoll("3D6", [1, 1, 1], 3), Roller, Now)],
            records);
    }

    [Fact]
    public void Given_both_luck_rolls_When_rolling_the_missing_Then_nothing_is_rolled()
    {
        var sheet = SheetWith(
            RollRecord.PlayerEntered(RollPurposes.Luck, "3D6", 11),
            RollRecord.FromServer(RollPurposes.LuckSecondRoll, new DiceRoll("3D6", [1, 1, 1], 3), Roller, Now));

        Assert.Empty(LuckRolling.RollMissing(sheet, BracketFor(17), new ScriptedDiceRoller([1, 1, 1]), Roller, Now));
    }

    [Fact]
    public void Given_a_single_roll_bracket_with_a_second_luck_roll_When_rolling_the_missing_Then_only_luck_is_rolled()
    {
        var records = LuckRolling.RollMissing(SheetWith(), BracketFor(25), new ScriptedDiceRoller([2, 5, 6]), Roller, Now);

        Assert.Single(records);
        Assert.Equal(RollPurposes.Luck, records[0].Purpose);
    }
}
