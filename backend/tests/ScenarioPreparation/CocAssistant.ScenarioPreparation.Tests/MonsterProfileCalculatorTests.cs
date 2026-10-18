namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// A Monster Profile's worked-out values (docs/game-rules/project_ruleset.md sections 5.4 and 5.9; NPC ruleset sections
/// 3.2 and 3.4) and the Investigator Difficulty of its Opposing Values. The human MOV formula never runs for a monster.
/// </summary>
public class MonsterProfileCalculatorTests
{
    private static CharacteristicDerivedValues Derive(MonsterProfile profile) =>
        MonsterProfileCalculator.Derive(profile, MonsterProfileSamples.Rules);

    [Fact]
    public void Given_the_Ghoul_When_derived_Then_hit_points_magic_points_damage_bonus_and_build_follow_the_rules()
    {
        Assert.Equal(new CharacteristicDerivedValues(12, 12, "+1D4", 1), Derive(MonsterProfileSamples.Ghoul()));
    }

    [Fact]
    public void Given_strength_plus_size_above_524_When_derived_Then_the_kernel_progression_gives_damage_bonus_and_build()
    {
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("STR", 400), ("SIZ", 200)));

        var derived = Derive(profile);

        Assert.Equal(("+6D6", 7), (derived.DamageBonus, derived.Build));
    }

    [Fact]
    public void Given_no_characteristics_section_or_missing_characteristics_When_derived_Then_each_value_is_null()
    {
        Assert.Equal(new CharacteristicDerivedValues(null, null, null, null), Derive(MonsterProfile.Empty));
        Assert.Equal(
            new CharacteristicDerivedValues(null, 12, null, null),
            Derive(MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("POW", 60), ("STR", 80)))));
    }

    [Fact]
    public void Given_overrides_When_derived_Then_the_computed_values_are_unchanged()
    {
        var overrides = new MonsterOverrides(
            new NumberOverride(99, "Swollen"),
            new NumberOverride(50, "Reason"),
            new DamageBonusOverride("+3D6", "Reason"),
            new NumberOverride(5, "Reason"));
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.WithOverrides(overrides));

        Assert.Equal(new CharacteristicDerivedValues(12, null, "+1D4", 1), Derive(profile));
    }

    [Fact]
    public void Given_Hit_Points_not_applicable_When_derived_Then_Hit_Points_are_still_computed()
    {
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.WithOverrides(MonsterOverrides.None, hitPointsNotApplicable: true));

        Assert.Equal(12, Derive(profile).HitPoints);
    }

    [Theory]
    [InlineData(0, InvestigatorDifficulty.Regular)]
    [InlineData(49, InvestigatorDifficulty.Regular)]
    [InlineData(50, InvestigatorDifficulty.Hard)]
    [InlineData(89, InvestigatorDifficulty.Hard)]
    [InlineData(90, InvestigatorDifficulty.Extreme)]
    [InlineData(2_000, InvestigatorDifficulty.Extreme)]
    public void Given_an_opposing_value_When_its_difficulty_is_worked_out_Then_it_follows_the_kernel(int value, InvestigatorDifficulty expected)
    {
        Assert.Equal(expected, MonsterProfileCalculator.DifficultyOf(value));
    }
}
