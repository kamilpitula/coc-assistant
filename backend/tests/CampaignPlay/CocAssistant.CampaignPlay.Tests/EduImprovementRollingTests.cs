namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Server-side EDU improvement checks (docs/game-rules/coc7_character_creation_and_development_rules.md sections 3.1 and
/// 3.2): one action rolls the next check's D100 and, when the check improves EDU, its 1D10 gain in the same action.
/// </summary>
public class EduImprovementRollingTests
{
    private static readonly Guid Roller = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 11, 9, 12, 0, 0, TimeSpan.Zero);

    private static AgeBracket BracketFor(int age) => TestRules.Creation.AgeRules.BracketFor(age)!;

    private static CharacterSheet PointBuySheet(int age, int edu, params RollRecord[] records) =>
        CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.PointBuy,
            Identity = new InvestigatorIdentity("Harvey Walters", age, null, null, null),
            AssignedCharacteristics = CharacteristicValues.Empty.With(Characteristic.Education, edu),
            RollRecords = records,
        };

    [Fact]
    public void Section_3_2_Given_a_check_above_edu_When_rolling_next_Then_the_check_and_its_gain_are_server_rolled()
    {
        var records = EduImprovementRolling.RollNext(
            PointBuySheet(25, 50), BracketFor(25), new ScriptedDiceRoller([60, 4]), Roller, Now);

        Assert.Equal(
            [
                RollRecord.FromServer(RollPurposes.EduImprovementCheck(1), new DiceRoll("D100", [60], 60), Roller, Now),
                RollRecord.FromServer(RollPurposes.EduImprovementGain(1), new DiceRoll("1D10", [4], 4), Roller, Now),
            ],
            records);
    }

    [Fact]
    public void Section_3_2_Given_a_check_at_or_below_edu_When_rolling_next_Then_no_gain_is_rolled()
    {
        var records = EduImprovementRolling.RollNext(
            PointBuySheet(25, 50), BracketFor(25), new ScriptedDiceRoller([50]), Roller, Now);

        Assert.Equal(
            [RollRecord.FromServer(RollPurposes.EduImprovementCheck(1), new DiceRoll("D100", [50], 50), Roller, Now)],
            records);
    }

    [Fact]
    public void Section_3_2_Given_a_second_check_When_rolling_next_Then_it_rolls_against_edu_after_the_first_gain()
    {
        var sheet = PointBuySheet(
            45,
            50,
            RollRecord.FromServer(RollPurposes.EduImprovementCheck(1), new DiceRoll("D100", [60], 60), Roller, Now),
            RollRecord.FromServer(RollPurposes.EduImprovementGain(1), new DiceRoll("1D10", [4], 4), Roller, Now));

        var records = EduImprovementRolling.RollNext(sheet, BracketFor(45), new ScriptedDiceRoller([70, 3]), Roller, Now);

        Assert.Equal(
            [
                RollRecord.FromServer(RollPurposes.EduImprovementCheck(2), new DiceRoll("D100", [70], 70), Roller, Now),
                RollRecord.FromServer(RollPurposes.EduImprovementGain(2), new DiceRoll("1D10", [3], 3), Roller, Now),
            ],
            records);
    }

    [Fact]
    public void Section_3_2_Given_a_check_below_edu_after_the_first_gain_When_rolling_next_Then_no_gain_is_rolled()
    {
        var sheet = PointBuySheet(
            45,
            50,
            RollRecord.FromServer(RollPurposes.EduImprovementCheck(1), new DiceRoll("D100", [52], 52), Roller, Now),
            RollRecord.FromServer(RollPurposes.EduImprovementGain(1), new DiceRoll("1D10", [5], 5), Roller, Now));

        var records = EduImprovementRolling.RollNext(sheet, BracketFor(45), new ScriptedDiceRoller([53]), Roller, Now);

        Assert.Equal(
            [RollRecord.FromServer(RollPurposes.EduImprovementCheck(2), new DiceRoll("D100", [53], 53), Roller, Now)],
            records);
    }

    [Fact]
    public void Given_every_bracket_check_done_When_rolling_next_Then_nothing_is_rolled()
    {
        var sheet = PointBuySheet(
            25,
            50,
            RollRecord.FromServer(RollPurposes.EduImprovementCheck(1), new DiceRoll("D100", [30], 30), Roller, Now));

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([70, 3]), Roller, Now));
    }

    [Fact]
    public void Given_a_legacy_check_missing_its_gain_When_rolling_next_Then_the_gain_is_never_filled_in()
    {
        var sheet = PointBuySheet(25, 50, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 80));

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([40]), Roller, Now));
    }

    [Fact]
    public void Given_a_legacy_check_missing_its_gain_When_rolling_a_later_check_Then_only_the_later_check_is_rolled()
    {
        var sheet = PointBuySheet(45, 50, RollRecord.PlayerEntered(RollPurposes.EduImprovementCheck(1), "D100", 80));

        var records = EduImprovementRolling.RollNext(sheet, BracketFor(45), new ScriptedDiceRoller([40]), Roller, Now);

        Assert.Equal(
            [RollRecord.FromServer(RollPurposes.EduImprovementCheck(2), new DiceRoll("D100", [40], 40), Roller, Now)],
            records);
    }

    [Theory]
    [InlineData(95)]
    [InlineData(null)]
    public void Given_a_point_buy_edu_outside_its_bounds_When_rolling_next_Then_nothing_is_rolled(int? edu)
    {
        var sheet = CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.PointBuy,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            AssignedCharacteristics = CharacteristicValues.Empty.With(Characteristic.Education, edu),
        };

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([80, 8]), Roller, Now));
    }

    [Fact]
    public void Given_a_quick_fire_edu_outside_its_pool_When_rolling_next_Then_nothing_is_rolled()
    {
        var sheet = CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.QuickFire,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            AssignedCharacteristics = CharacteristicValues.Empty.With(Characteristic.Education, 75),
        };

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([80, 8]), Roller, Now));
    }

    [Fact]
    public void Given_a_standard_rolling_sheet_without_an_edu_roll_When_rolling_next_Then_nothing_is_rolled()
    {
        var sheet = CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.StandardRolling,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
        };

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([80, 8]), Roller, Now));
    }

    [Fact]
    public void Given_a_standard_rolling_sheet_with_an_impossible_legacy_edu_roll_When_rolling_next_Then_nothing_is_rolled()
    {
        var sheet = CharacterSheet.Empty with
        {
            CreationMethod = CreationMethod.StandardRolling,
            Identity = new InvestigatorIdentity("Harvey Walters", 25, null, null, null),
            RollRecords = [RollRecord.PlayerEntered(RollPurposes.Characteristic(Characteristic.Education), "2D6", 13)],
        };

        Assert.Empty(EduImprovementRolling.RollNext(sheet, BracketFor(25), new ScriptedDiceRoller([80, 8]), Roller, Now));
    }
}
