namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// An NPC Profile's worked-out values (docs/game-rules/project_ruleset.md sections 5.3 and 5.4; NPC ruleset sections 3.2
/// and 3.3) and the Investigator Difficulty of its Opposing Values.
/// </summary>
public class NpcProfileCalculatorTests
{
    private static NpcDerivedValues Derive(NpcProfile profile) => NpcProfileCalculator.Derive(profile, NpcProfileSamples.Rules);

    private static NpcProfile Aged(int age, params (string Code, int? Value)[] values) =>
        NpcProfileSamples.Narrative(age) with { Characteristics = NpcProfileSamples.Characteristics(values) };

    [Fact]
    public void Given_the_Thug_When_derived_Then_hit_points_magic_points_damage_bonus_build_and_movement_follow_the_rules()
    {
        var derived = Derive(NpcProfileSamples.Thug());

        Assert.Equal(new NpcDerivedValues(12, 10, "+1D4", 1, 8, false), derived);
    }

    [Fact]
    public void Given_no_characteristics_section_When_derived_Then_nothing_is_shown()
    {
        Assert.Equal(new NpcDerivedValues(null, null, null, null, null, false), Derive(NpcProfileSamples.Narrative()));
    }

    [Fact]
    public void Given_a_missing_characteristic_When_derived_Then_only_the_values_it_feeds_are_hidden()
    {
        var derived = Derive(Aged(30, ("STR", 70), ("SIZ", 65), ("POW", 50)));

        Assert.Equal(new NpcDerivedValues(null, 10, "+1D4", 1, null, false), derived);
    }

    [Fact]
    public void Given_only_constitution_and_size_When_derived_Then_hit_points_are_shown()
    {
        Assert.Equal(12, Derive(Aged(30, ("CON", 60), ("SIZ", 65))).HitPoints);
    }

    [Fact]
    public void Given_strength_plus_size_below_the_table_When_derived_Then_damage_bonus_and_build_are_hidden()
    {
        var derived = Derive(Aged(30, ("STR", 0), ("SIZ", 1)));

        Assert.Equal((null, null), (derived.DamageBonus, derived.Build));
    }

    [Theory]
    [InlineData(14, false, true)]
    [InlineData(15, true, false)]
    [InlineData(89, true, false)]
    [InlineData(90, false, true)]
    [InlineData(95, false, true)]
    public void Given_the_ages_around_the_covered_range_When_derived_Then_movement_is_computed_only_for_15_to_89(int age, bool computed, bool notCovered)
    {
        var derived = Derive(Aged(age, ("STR", 70), ("DEX", 55), ("SIZ", 65)));

        Assert.Equal((computed, notCovered), (derived.MovementRate is not null, derived.MovementRateNotCovered));
    }

    [Fact]
    public void Given_an_age_in_the_80s_When_derived_Then_the_age_penalty_applies()
    {
        Assert.Equal(3, Derive(Aged(85, ("STR", 70), ("DEX", 55), ("SIZ", 65))).MovementRate);
    }

    [Fact]
    public void Given_an_uncovered_age_and_a_missing_movement_characteristic_When_derived_Then_movement_is_not_shown_at_all()
    {
        var derived = Derive(Aged(95, ("STR", 70), ("SIZ", 65)));

        Assert.Equal((null, false), (derived.MovementRate, derived.MovementRateNotCovered));
    }

    [Fact]
    public void Given_a_profile_without_an_age_When_derived_Then_movement_is_not_shown()
    {
        var derived = Derive(Aged(30, ("STR", 70), ("DEX", 55), ("SIZ", 65)) with { Age = null });

        Assert.Equal((null, false), (derived.MovementRate, derived.MovementRateNotCovered));
    }

    [Theory]
    [InlineData(55, InvestigatorDifficulty.Hard)]
    [InlineData(49, InvestigatorDifficulty.Regular)]
    [InlineData(90, InvestigatorDifficulty.Extreme)]
    public void Given_an_opposing_value_When_its_difficulty_is_found_Then_it_follows_the_kernel_thresholds(int value, InvestigatorDifficulty expected)
    {
        Assert.Equal(expected, NpcProfileCalculator.DifficultyOf(value));
    }
}
