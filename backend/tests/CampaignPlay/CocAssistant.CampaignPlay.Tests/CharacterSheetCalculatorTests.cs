namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Computing a Character Sheet's values after age effects
/// (docs/game-rules/coc7_character_creation_and_development_rules.md sections 3.1 and 3.3, then sections 4 and 5).
/// </summary>
public class CharacterSheetCalculatorTests
{
    private static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();
    private static readonly CharacterSheetCalculator Calculator = TestRules.Calculator;

    // Scenario: Point Buy Investigator applies age effects before Hard and Extreme values
    [Fact]
    public void Section_3_3_Given_age_45_with_a_split_deduction_and_an_EDU_gain_When_calculating_Then_values_follow_the_age_modifier_order()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAge(45)
            .WithDeduction(Characteristic.Strength, 3)
            .WithDeduction(Characteristic.Dexterity, 2)
            .WithEduImprovementChecks(new EduImprovementCheckInput(70, 5), new EduImprovementCheckInput(20, null))
            .Build();

        var computation = Calculator.Calculate(sheet);

        Assert.Equal(40, computation.Bracket!.MinimumAge);
        var final = computation.FinalCharacteristics;
        Assert.Equal(57, final[Characteristic.Strength]);
        Assert.Equal(60, final[Characteristic.Constitution]);
        Assert.Equal(58, final[Characteristic.Dexterity]);
        Assert.Equal(45, final[Characteristic.Appearance]);
        Assert.Equal(55, final[Characteristic.Education]);
        Assert.Equal(new CharacteristicLevels(45, 22, 9), computation.LevelsOf(Characteristic.Appearance));
    }

    [Fact]
    public void Section_5_1_Given_INT_60_and_EDU_after_an_improvement_When_calculating_Then_idea_is_INT_and_know_is_EDU_after_age_effects()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAge(45)
            .WithDeduction(Characteristic.Strength, 5)
            .WithEduImprovementChecks(new EduImprovementCheckInput(70, 5), new EduImprovementCheckInput(20, null))
            .Build();

        var derived = Calculator.Calculate(sheet).Derived;

        Assert.Equal(60, derived.Idea);
        Assert.Equal(55, derived.Know);
    }

    [Fact]
    public void Section_5_1_Given_no_INT_or_EDU_When_calculating_Then_idea_and_know_are_not_calculated()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAssigned(Characteristic.Intelligence, null)
            .WithAssigned(Characteristic.Education, null)
            .Build();

        var derived = Calculator.Calculate(sheet).Derived;

        Assert.Null(derived.Idea);
        Assert.Null(derived.Know);
    }

    [Fact]
    public void Section_5_Given_a_complete_sheet_at_age_45_When_calculating_Then_every_derived_value_uses_the_values_after_age_effects()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAge(45)
            .WithDeduction(Characteristic.Strength, 3)
            .WithDeduction(Characteristic.Dexterity, 2)
            .WithEduImprovementChecks(new EduImprovementCheckInput(30, null), new EduImprovementCheckInput(20, null))
            .WithLuckRolls(11)
            .Build();

        var derived = Calculator.Calculate(sheet).Derived;

        // STR 57, CON 60, DEX 58, POW 60, SIZ 60 after age effects: MOV 7 less 1 in the 40s; STR + SIZ = 117.
        Assert.Equal(new DerivedValues(
            Luck: 55,
            HitPoints: 12,
            MagicPoints: 12,
            SanityCurrent: 60,
            SanityMaximum: 99,
            Dodge: 29,
            MovementRate: 6,
            DamageBonus: "0",
            Build: 0,
            Idea: 60,
            Know: 50), SectionFiveValuesOf(derived));
    }

    [Fact]
    public void Given_no_valid_age_When_calculating_Then_values_after_age_effects_and_derived_values_are_not_calculated()
    {
        var computation = Calculator.Calculate(new CharacterSheetBuilder().WithAge(null).Build());

        Assert.Null(computation.Bracket);
        Assert.Empty(computation.FinalCharacteristics.Present);
        Assert.Null(computation.LevelsOf(Characteristic.Strength));
        Assert.Equal(DerivedValues.NotCalculated, SectionFiveValuesOf(computation.Derived));
    }

    // The section 5 values only; budgets, Credit Rating, and wealth are covered by SkillComputationTests.
    private static DerivedValues SectionFiveValuesOf(DerivedValues derived) =>
        derived with { OccupationPoints = null, PersonalInterestPoints = null, CreditRating = null, Wealth = null };

    [Fact]
    public void Given_a_missing_characteristic_When_calculating_Then_only_the_values_that_need_it_are_not_calculated()
    {
        var computation = Calculator.Calculate(new CharacterSheetBuilder().WithAssigned(Characteristic.Power, null).Build());

        Assert.Null(computation.FinalCharacteristics[Characteristic.Power]);
        Assert.Null(computation.Derived.MagicPoints);
        Assert.Null(computation.Derived.SanityCurrent);
        Assert.Equal(12, computation.Derived.HitPoints);
    }

    [Fact]
    public void Section_3_1_Given_a_deduction_entered_for_a_characteristic_outside_the_bracket_When_calculating_Then_it_is_not_applied()
    {
        var sheet = new CharacterSheetBuilder().WithAge(45).WithDeduction(Characteristic.Size, 5).Build();

        Assert.Equal(60, Calculator.Calculate(sheet).FinalCharacteristics[Characteristic.Size]);
    }

    [Fact]
    public void Section_3_2_Given_more_EDU_checks_than_the_bracket_requires_When_calculating_Then_only_the_required_checks_apply()
    {
        var sheet = new CharacterSheetBuilder()
            .WithEduImprovementChecks(new EduImprovementCheckInput(30, null), new EduImprovementCheckInput(90, 9))
            .Build();

        var computation = Calculator.Calculate(sheet);

        Assert.Equal(50, computation.FinalCharacteristics[Characteristic.Education]);
        Assert.Single(computation.EduImprovementOutcomes);
    }
}
