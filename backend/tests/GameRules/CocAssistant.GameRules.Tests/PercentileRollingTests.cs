namespace CocAssistant.GameRules.Tests;

public class PercentileRollingTests
{
    private static PercentileRoll Resolve(int target, Difficulty difficulty, int units, params int[] tens) =>
        PercentileRolling.Resolve(new PercentileRollInput(target, difficulty, 0, 0, units, tens));

    [Fact]
    public void Given_tens_00_and_units_0_When_resolving_Then_the_result_reads_100_skill_rolls_section_1()
    {
        var roll = Resolve(50, Difficulty.Regular, 0, 0);

        Assert.Equal(0, roll.KeptTens);
        Assert.Equal(100, roll.Result);
    }

    [Fact]
    public void Given_tens_20_and_units_5_When_resolving_Then_the_result_is_25_skill_rolls_section_1()
    {
        var roll = Resolve(50, Difficulty.Regular, 5, 20);

        Assert.Equal(20, roll.KeptTens);
        Assert.Equal(25, roll.Result);
    }

    [Fact]
    public void Given_target_61_When_resolving_Then_hard_and_extreme_targets_are_floored_skill_rolls_section_2()
    {
        var roll = Resolve(61, Difficulty.Regular, 5, 20);

        Assert.Equal(61, roll.RegularTarget);
        Assert.Equal(30, roll.HardTarget);
        Assert.Equal(12, roll.ExtremeTarget);
    }

    [Fact]
    public void Given_regular_difficulty_When_resolving_Then_the_required_target_is_the_full_value_skill_rolls_section_3()
    {
        var roll = Resolve(60, Difficulty.Regular, 5, 20);

        Assert.Equal(SuccessLevel.Hard, roll.SuccessLevel);
        Assert.True(roll.IsSuccess);
    }

    [Fact]
    public void Given_hard_45_at_target_60_When_resolving_Then_the_level_is_regular_but_not_a_success_skill_rolls_section_43()
    {
        var roll = Resolve(60, Difficulty.Hard, 5, 40);

        Assert.Equal(SuccessLevel.Regular, roll.SuccessLevel);
        Assert.False(roll.IsSuccess);
    }

    [Fact]
    public void Given_result_01_When_resolving_Then_it_is_a_critical_success_at_every_difficulty_skill_rolls_section_42()
    {
        foreach (var difficulty in new[] { Difficulty.Regular, Difficulty.Hard, Difficulty.Extreme })
        {
            var roll = Resolve(40, difficulty, 1, 0);

            Assert.Equal(SuccessLevel.Critical, roll.SuccessLevel);
            Assert.True(roll.IsSuccess);
        }
    }

    [Fact]
    public void Given_target_0_When_rolling_01_Then_it_is_a_critical_success_project_ruleset_section_47()
    {
        var roll = Resolve(0, Difficulty.Regular, 1, 0);

        Assert.Equal(SuccessLevel.Critical, roll.SuccessLevel);
        Assert.True(roll.IsSuccess);
    }

    [Fact]
    public void Given_target_0_When_rolling_anything_else_Then_it_fails_project_ruleset_section_47()
    {
        var roll = Resolve(0, Difficulty.Regular, 5, 20);

        Assert.Equal(SuccessLevel.Failure, roll.SuccessLevel);
        Assert.False(roll.IsSuccess);
    }

    [Fact]
    public void Given_required_target_below_50_When_rolling_96_or_more_Then_it_is_a_fumble_skill_rolls_section_42()
    {
        var roll = Resolve(40, Difficulty.Regular, 6, 90);

        Assert.Equal(SuccessLevel.Fumble, roll.SuccessLevel);
        Assert.False(roll.IsSuccess);
    }

    [Fact]
    public void Given_required_target_at_least_50_When_rolling_99_Then_it_is_a_failure_not_a_fumble_skill_rolls_section_42()
    {
        var roll = Resolve(60, Difficulty.Regular, 9, 90);

        Assert.Equal(SuccessLevel.Failure, roll.SuccessLevel);
        Assert.False(roll.IsSuccess);
    }

    [Fact]
    public void Given_required_target_at_least_50_When_rolling_100_Then_it_is_a_fumble_skill_rolls_section_42()
    {
        var roll = Resolve(60, Difficulty.Regular, 0, 0);

        Assert.Equal(100, roll.Result);
        Assert.Equal(SuccessLevel.Fumble, roll.SuccessLevel);
        Assert.False(roll.IsSuccess);
    }

    [Theory]
    [InlineData(1, SuccessLevel.Critical, true)]
    [InlineData(12, SuccessLevel.Extreme, true)]
    [InlineData(30, SuccessLevel.Hard, true)]
    [InlineData(60, SuccessLevel.Regular, true)]
    [InlineData(61, SuccessLevel.Failure, false)]
    public void Given_target_60_at_regular_When_resolving_Then_each_result_has_its_level_skill_rolls_section_43(
        int result, SuccessLevel level, bool success)
    {
        var tens = result == 100 ? 0 : result / 10 * 10;
        var roll = Resolve(60, Difficulty.Regular, result - tens, tens);

        Assert.Equal(level, roll.SuccessLevel);
        Assert.Equal(success, roll.IsSuccess);
    }

    [Theory]
    [InlineData(1, SuccessLevel.Critical, true)]
    [InlineData(12, SuccessLevel.Extreme, true)]
    [InlineData(30, SuccessLevel.Hard, true)]
    [InlineData(45, SuccessLevel.Regular, false)]
    [InlineData(61, SuccessLevel.Failure, false)]
    [InlineData(96, SuccessLevel.Fumble, false)]
    public void Given_target_60_at_hard_When_resolving_Then_each_result_has_its_level_skill_rolls_section_43(
        int result, SuccessLevel level, bool success)
    {
        var tens = result / 10 * 10;
        var roll = Resolve(60, Difficulty.Hard, result - tens, tens);

        Assert.Equal(level, roll.SuccessLevel);
        Assert.Equal(success, roll.IsSuccess);
    }

    [Theory]
    [InlineData(1, SuccessLevel.Critical, true)]
    [InlineData(12, SuccessLevel.Extreme, true)]
    [InlineData(13, SuccessLevel.Hard, false)]
    [InlineData(31, SuccessLevel.Regular, false)]
    [InlineData(61, SuccessLevel.Failure, false)]
    [InlineData(96, SuccessLevel.Fumble, false)]
    public void Given_target_60_at_extreme_When_resolving_Then_each_result_has_its_level_skill_rolls_section_43(
        int result, SuccessLevel level, bool success)
    {
        var tens = result / 10 * 10;
        var roll = Resolve(60, Difficulty.Extreme, result - tens, tens);

        Assert.Equal(level, roll.SuccessLevel);
        Assert.Equal(success, roll.IsSuccess);
    }

    [Fact]
    public void Given_one_bonus_die_When_resolving_Then_the_lower_tens_die_is_kept_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 1, 0, 3, [20, 70]));

        Assert.Equal(20, roll.KeptTens);
        Assert.Equal(23, roll.Result);
        Assert.Equal(SuccessLevel.Hard, roll.SuccessLevel);
        Assert.Equal([20, 70], roll.TensFaces);
    }

    [Fact]
    public void Given_two_bonus_dice_When_resolving_Then_the_lowest_of_three_tens_dice_is_kept_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 2, 0, 5, [80, 20, 60]));

        Assert.Equal(20, roll.KeptTens);
        Assert.Equal(25, roll.Result);
    }

    [Fact]
    public void Given_one_penalty_die_When_resolving_Then_the_higher_tens_die_is_kept_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 0, 1, 3, [20, 70]));

        Assert.Equal(70, roll.KeptTens);
        Assert.Equal(73, roll.Result);
        Assert.Equal(SuccessLevel.Failure, roll.SuccessLevel);
    }

    [Fact]
    public void Given_two_penalty_dice_When_resolving_Then_the_highest_of_three_tens_dice_is_kept_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 0, 2, 5, [80, 20, 60]));

        Assert.Equal(80, roll.KeptTens);
        Assert.Equal(85, roll.Result);
    }

    [Fact]
    public void Given_one_bonus_and_one_penalty_die_When_resolving_Then_the_single_tens_die_is_kept_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 1, 1, 5, [20]));

        Assert.Equal(20, roll.KeptTens);
        Assert.Equal(25, roll.Result);
    }

    [Fact]
    public void Given_five_bonus_dice_When_resolving_Then_the_net_is_clamped_to_two_skill_rolls_section_5()
    {
        var roll = PercentileRolling.Resolve(new PercentileRollInput(50, Difficulty.Regular, 5, 0, 5, [90, 80, 70]));

        Assert.Equal(70, roll.KeptTens);
        Assert.Equal(75, roll.Result);
    }

    [Fact]
    public void Given_no_bonus_or_penalty_dice_When_rolling_Then_one_tens_die_and_one_units_die_are_drawn()
    {
        var roller = new ScriptedDiceRoller([2, 5]);

        var roll = PercentileRolling.Roll(roller, 50, Difficulty.Regular, 0, 0);

        Assert.Equal([20], roll.TensFaces);
        Assert.Equal(5, roll.UnitsFace);
        Assert.Equal(25, roll.Result);
        Assert.Throws<InvalidOperationException>(() => roller.Roll(10));
    }

    [Fact]
    public void Given_two_bonus_dice_When_rolling_Then_three_tens_dice_and_one_units_die_are_drawn()
    {
        var roller = new ScriptedDiceRoller([8, 2, 6, 5]);

        var roll = PercentileRolling.Roll(roller, 50, Difficulty.Regular, 2, 0);

        Assert.Equal([80, 20, 60], roll.TensFaces);
        Assert.Equal(5, roll.UnitsFace);
        Assert.Equal(25, roll.Result);
        Assert.Throws<InvalidOperationException>(() => roller.Roll(10));
    }

    [Fact]
    public void Given_one_bonus_and_one_penalty_die_When_rolling_Then_one_tens_die_and_one_units_die_are_drawn()
    {
        var roller = new ScriptedDiceRoller([2, 5]);

        var roll = PercentileRolling.Roll(roller, 50, Difficulty.Regular, 1, 1);

        Assert.Equal([20], roll.TensFaces);
        Assert.Equal(25, roll.Result);
        Assert.Throws<InvalidOperationException>(() => roller.Roll(10));
    }

    [Fact]
    public void Given_five_bonus_dice_When_rolling_Then_the_draw_is_clamped_to_three_tens_dice()
    {
        var roller = new ScriptedDiceRoller([9, 8, 7, 5]);

        var roll = PercentileRolling.Roll(roller, 50, Difficulty.Regular, 5, 0);

        Assert.Equal([90, 80, 70], roll.TensFaces);
        Assert.Equal(75, roll.Result);
        Assert.Throws<InvalidOperationException>(() => roller.Roll(10));
    }

    [Fact]
    public void Given_faces_of_10_When_rolling_Then_they_read_as_00_and_0_for_100_skill_rolls_section_1()
    {
        var roll = PercentileRolling.Roll(new ScriptedDiceRoller([10, 10]), 50, Difficulty.Regular, 0, 0);

        Assert.Equal([0], roll.TensFaces);
        Assert.Equal(0, roll.UnitsFace);
        Assert.Equal(100, roll.Result);
    }
}
