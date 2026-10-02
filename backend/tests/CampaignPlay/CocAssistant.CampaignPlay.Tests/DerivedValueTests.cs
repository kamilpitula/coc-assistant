namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Values the system derives from characteristics and age, one test group per rule section of
/// docs/game-rules/coc7_character_creation_and_development_rules.md. Expected values are worked by hand from those
/// sections and from docs/game-rules/catalogs/characteristics-rules.json.
/// </summary>
public class DerivedValueTests
{
    private static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();

    [Theory]
    [InlineData(55, 27, 11)]
    [InlineData(90, 45, 18)]
    [InlineData(15, 7, 3)]
    public void Section_4_Given_a_regular_value_When_deriving_its_levels_Then_hard_is_half_and_extreme_is_a_fifth_rounded_down(int regular, int hard, int extreme)
    {
        Assert.Equal(new CharacteristicLevels(regular, hard, extreme), CharacteristicLevels.For(regular));
    }

    [Fact]
    public void Section_3_2_Given_a_check_above_EDU_with_its_gain_When_evaluating_Then_EDU_improves_by_the_gain()
    {
        var outcome = Assert.Single(EduImprovement.Evaluate(50, [new EduImprovementCheckInput(70, 5)]));

        Assert.Equal(new EduImprovementOutcome(1, 70, 5, 50, 55, Improves: true), outcome);
    }

    [Fact]
    public void Section_3_2_Given_a_check_not_above_EDU_When_evaluating_Then_EDU_is_unchanged()
    {
        var outcome = Assert.Single(EduImprovement.Evaluate(50, [new EduImprovementCheckInput(50, null)]));

        Assert.False(outcome.Improves);
        Assert.Equal(50, outcome.EduAfter);
    }

    [Fact]
    public void Section_3_2_Given_several_checks_When_evaluating_Then_each_compares_against_EDU_after_the_earlier_gains()
    {
        var outcomes = EduImprovement.Evaluate(50, [new EduImprovementCheckInput(70, 5), new EduImprovementCheckInput(53, null), new EduImprovementCheckInput(56, 2)]);

        Assert.Equal([55, 55, 57], outcomes.Select(outcome => outcome.EduAfter));
        Assert.Equal([true, false, true], outcomes.Select(outcome => outcome.Improves));
    }

    [Fact]
    public void Section_3_2_Given_a_gain_that_would_pass_99_When_evaluating_Then_EDU_stops_at_99()
    {
        var outcome = Assert.Single(EduImprovement.Evaluate(95, [new EduImprovementCheckInput(100, 10)]));

        Assert.Equal(99, outcome.EduAfter);
    }

    [Fact]
    public void Section_3_2_Given_a_missing_roll_or_gain_When_evaluating_Then_EDU_is_unchanged_by_that_check()
    {
        var outcomes = EduImprovement.Evaluate(50, [new EduImprovementCheckInput(null, null), new EduImprovementCheckInput(70, null)]);

        Assert.Equal([50, 50], outcomes.Select(outcome => outcome.EduAfter));
        Assert.Equal([false, true], outcomes.Select(outcome => outcome.Improves));
    }

    [Fact]
    public void Section_5_5_Given_one_luck_roll_When_calculating_luck_Then_it_is_the_raw_total_times_five()
    {
        var bracket = RuleData.AgeRules.BracketFor(25)!;

        Assert.Equal(55, LuckValue.Calculate(bracket, [11]));
    }

    [Fact]
    public void Section_5_5_Given_age_17_and_two_luck_rolls_When_calculating_luck_Then_the_higher_is_kept()
    {
        var bracket = RuleData.AgeRules.BracketFor(17)!;

        Assert.Equal(65, LuckValue.Calculate(bracket, [11, 13]));
        Assert.Equal(65, LuckValue.Calculate(bracket, [13, 11]));
        Assert.Null(LuckValue.Calculate(bracket, [11]));
    }

    [Fact]
    public void Section_5_2_Given_POW_When_deriving_sanity_Then_it_starts_at_POW_with_a_maximum_of_99()
    {
        Assert.Equal((60, 99), StartingSanity.For(60));
    }

    [Theory]
    [InlineData(60, 12)]
    [InlineData(58, 11)]
    public void Section_5_3_Given_POW_When_deriving_magic_points_Then_they_are_a_fifth_of_POW_rounded_down(int power, int magicPoints)
    {
        Assert.Equal(magicPoints, MagicPoints.For(power));
    }

    [Theory]
    [InlineData(60, 60, 12)]
    [InlineData(55, 60, 11)]
    public void Section_5_4_Given_CON_and_SIZ_When_deriving_hit_points_Then_they_are_a_tenth_of_the_sum_rounded_down(int constitution, int size, int hitPoints)
    {
        Assert.Equal(hitPoints, HitPoints.For(constitution, size));
    }

    [Fact]
    public void Section_5_6_Given_DEX_When_deriving_dodge_Then_it_starts_at_half_DEX_rounded_down()
    {
        Assert.Equal(27, DodgeBase.For(55));
    }

    [Theory]
    [InlineData(40, 45, 60, 25, 7)]
    [InlineData(70, 70, 60, 25, 9)]
    [InlineData(60, 70, 60, 25, 8)]
    [InlineData(70, 50, 60, 39, 8)]
    [InlineData(60, 70, 60, 45, 7)]
    [InlineData(60, 70, 60, 55, 6)]
    [InlineData(60, 70, 60, 65, 5)]
    [InlineData(60, 70, 60, 75, 4)]
    [InlineData(60, 70, 60, 85, 3)]
    public void Section_5_7_Given_STR_DEX_SIZ_and_age_When_deriving_movement_rate_Then_the_base_and_age_penalty_apply(
        int strength, int dexterity, int size, int age, int movementRate)
    {
        Assert.Equal(movementRate, MovementRate.For(strength, dexterity, size, age));
    }

    [Theory]
    [InlineData(64, "-2", -2)]
    [InlineData(65, "-1", -1)]
    [InlineData(124, "0", 0)]
    [InlineData(125, "+1D4", 1)]
    [InlineData(180, "+1D6", 2)]
    [InlineData(524, "+5D6", 6)]
    [InlineData(525, "+6D6", 7)]
    [InlineData(604, "+6D6", 7)]
    [InlineData(605, "+7D6", 8)]
    public void Section_5_8_Given_STR_plus_SIZ_When_deriving_damage_bonus_and_build_Then_they_follow_the_table_and_the_formula_above_524(
        int strengthSize, string damageBonus, int build)
    {
        var result = DamageBonusAndBuild.For(strengthSize, RuleData.CharacteristicsRules);

        Assert.Equal((damageBonus, build), result);
    }

    [Fact]
    public void Section_5_8_Given_STR_plus_SIZ_below_the_table_When_deriving_damage_bonus_Then_it_cannot_be_calculated()
    {
        Assert.Null(DamageBonusAndBuild.For(1, RuleData.CharacteristicsRules));
    }
}
