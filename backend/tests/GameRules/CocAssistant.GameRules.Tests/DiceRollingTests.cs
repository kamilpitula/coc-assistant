namespace CocAssistant.GameRules.Tests;

public class DiceRollingTests
{
    private static DiceNotation Parse(string text)
    {
        Assert.True(DiceNotation.TryParse(text, DamageBonusUse.Refused, out var notation));
        return notation!;
    }

    [Fact]
    public void Given_scripted_faces_2_5_6_When_rolling_3D6_Then_faces_and_total_match_the_dice_spec_Gherkin()
    {
        var roll = DiceRolling.Roll(Parse("3D6"), new ScriptedDiceRoller([2, 5, 6]));

        Assert.Equal([2, 5, 6], roll.Faces);
        Assert.Equal(13, roll.Total);
    }

    [Fact]
    public void Given_D100_with_no_count_When_rolled_Then_one_face_is_recorded()
    {
        var roll = DiceRolling.Roll(Parse("D100"), new ScriptedDiceRoller([42]));

        Assert.Equal([42], roll.Faces);
        Assert.Equal(42, roll.Total);
    }

    [Fact]
    public void Given_lowercase_2d6_When_rolled_Then_both_faces_count()
    {
        var roll = DiceRolling.Roll(Parse("2d6"), new ScriptedDiceRoller([1, 2]));

        Assert.Equal([1, 2], roll.Faces);
        Assert.Equal(3, roll.Total);
    }

    [Fact]
    public void Given_constant_5_When_rolled_Then_there_are_no_faces()
    {
        var roll = DiceRolling.Roll(Parse("5"), new ScriptedDiceRoller([]));

        Assert.Empty(roll.Faces);
        Assert.Equal(5, roll.Total);
    }

    [Fact]
    public void Given_2D6_minus_1_When_rolled_Then_the_constant_is_subtracted()
    {
        var roll = DiceRolling.Roll(Parse("2D6-1"), new ScriptedDiceRoller([3, 4]));

        Assert.Equal([3, 4], roll.Faces);
        Assert.Equal(6, roll.Total);
    }

    [Fact]
    public void Given_1D6_plus_1D4_When_rolled_Then_faces_keep_their_order()
    {
        var roll = DiceRolling.Roll(Parse("1D6+1D4"), new ScriptedDiceRoller([5, 2]));

        Assert.Equal([5, 2], roll.Faces);
        Assert.Equal(7, roll.Total);
    }

    [Fact]
    public void Given_constant_0_When_rolled_Then_the_total_is_zero()
    {
        var roll = DiceRolling.Roll(Parse("0"), new ScriptedDiceRoller([]));

        Assert.Empty(roll.Faces);
        Assert.Equal(0, roll.Total);
    }

    [Fact]
    public void Given_sanity_loss_side_1D6_When_rolled_Then_it_rolls_like_any_dice()
    {
        var roll = DiceRolling.Roll(Parse("1D6"), new ScriptedDiceRoller([4]));

        Assert.Equal([4], roll.Faces);
        Assert.Equal(4, roll.Total);
    }

    [Fact]
    public void Given_damage_bonus_override_side_minus_1_When_rolled_Then_it_is_a_negative_constant()
    {
        Assert.True(DamageBonusNotation.TryParse("-1", out var notation));
        var magnitude = DiceRolling.Roll(notation!.Magnitude, new ScriptedDiceRoller([]));

        Assert.Empty(magnitude.Faces);
        Assert.Equal(-1, notation.Sign * magnitude.Total);
    }

    [Fact]
    public void Given_a_DB_term_When_rolled_Then_it_throws()
    {
        Assert.True(DiceNotation.TryParse("1D6+DB", DamageBonusUse.Allowed, out var notation));

        Assert.Throws<ArgumentException>(() => DiceRolling.Roll(notation!, new ScriptedDiceRoller([1])));
    }

    [Fact]
    public void Given_a_dice_expression_When_rolled_Then_it_matches_the_notation_result()
    {
        var expression = DiceExpression.Parse("3D6");
        var fromNotation = DiceRolling.Roll(Parse("3D6"), new ScriptedDiceRoller([2, 5, 6]));
        var fromExpression = DiceRolling.Roll(expression, new ScriptedDiceRoller([2, 5, 6]));

        Assert.Equal(fromNotation.Faces, fromExpression.Faces);
        Assert.Equal(fromNotation.Total, fromExpression.Total);
        Assert.Equal("3D6", fromExpression.Dice);
    }
}
