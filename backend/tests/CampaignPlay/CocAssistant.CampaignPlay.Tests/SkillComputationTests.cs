namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// What the calculator derives for skills, budgets, Credit Rating, and wealth, and the characteristics of the new
/// Creation Methods (docs/game-rules/coc7_character_creation_and_development_rules.md sections 2.1, 2.3, 3.3, 6, 7, 8,
/// 9, 11, and 18). Expected values are worked by hand from those sections and the 1920s catalogs.
/// </summary>
public class SkillComputationTests
{
    private static SkillReference Skill(string name, string? specialization = null) => new(name, specialization);

    /// <summary>The 1920s Antiquarian with every open slot picked.</summary>
    public static CharacterSheetBuilder AnAntiquarian() =>
        new CharacterSheetBuilder().WithCatalogOccupation(
            "antiquarian",
            null,
            [],
            [Skill("Art/Craft", "Painting")],
            [],
            [],
            [Skill("Language (Other)", "Latin")],
            [Skill("Charm")],
            [],
            [Skill("Firearms", "Handgun")]);

    private static SkillRow Row(CharacterSheetComputation computation, SkillReference skill) =>
        computation.Skills.Single(row => row.Skill.Equals(skill));

    [Fact]
    public void Section_7_2_Given_a_catalog_occupation_with_its_picks_When_calculating_Then_its_eight_skills_are_occupation_skills()
    {
        var computation = TestRules.Calculator.Calculate(AnAntiquarian().Build());

        Assert.Equal("Antiquarian", computation.Occupation!.Name);
        Assert.Equal(
            [
                Skill("Appraise"), Skill("Art/Craft", "Painting"), Skill("History"), Skill("Library Use"),
                Skill("Language (Other)", "Latin"), Skill("Charm"), Skill("Spot Hidden"), Skill("Firearms", "Handgun"),
            ],
            computation.Occupation.OccupationSkills);
        Assert.True(Row(computation, Skill("Charm")).IsOccupationSkill);
        Assert.False(Row(computation, Skill("Persuade")).IsOccupationSkill);
    }

    [Fact]
    public void Section_7_1_and_8_Given_allocations_When_calculating_Then_the_budgets_show_what_is_spent_and_left()
    {
        var sheet = AnAntiquarian()
            .WithSkills(
                new SkillAllocation(SkillReference.CreditRating, 40, null),
                new SkillAllocation(Skill("Library Use"), 50, 10),
                new SkillAllocation(Skill("Drive Auto"), null, 30))
            .Build();

        var derived = TestRules.Calculator.Calculate(sheet).Derived;

        Assert.Equal(new PointBudget(200, 90, 110), derived.OccupationPoints);
        Assert.Equal(new PointBudget(120, 40, 80), derived.PersonalInterestPoints);
    }

    [Fact]
    public void Section_9_Given_point_allocations_When_calculating_skills_Then_values_are_base_plus_points_with_hard_and_extreme()
    {
        var sheet = AnAntiquarian()
            .WithSkills(
                new SkillAllocation(Skill("Library Use"), 50, 10),
                new SkillAllocation(Skill("Dodge"), null, 10),
                new SkillAllocation(SkillReference.CreditRating, 40, null))
            .Build();

        var computation = TestRules.Calculator.Calculate(sheet);

        var libraryUse = Row(computation, Skill("Library Use"));
        Assert.Equal((20, 80, 40, 16), (libraryUse.Base, libraryUse.Value, libraryUse.Hard, libraryUse.Extreme));
        Assert.Equal((30, 40), (Row(computation, Skill("Dodge")).Base, Row(computation, Skill("Dodge")).Value));
        Assert.Equal(50, Row(computation, Skill("Language (Own)")).Value);
        Assert.Equal(0, Row(computation, SkillReference.CthulhuMythos).Value);
        Assert.Equal(40, computation.Derived.CreditRating);
    }

    [Fact]
    public void Section_6_2_Given_a_closed_family_specialization_When_calculating_Then_its_row_starts_at_the_listed_base()
    {
        var sheet = AnAntiquarian().WithSkills(new SkillAllocation(Skill("Firearms", "Bow"), null, 5)).Build();

        var bow = Row(TestRules.Calculator.Calculate(sheet), Skill("Firearms", "Bow"));

        Assert.Equal((15, 20), (bow.Base, bow.Value));
    }

    [Fact]
    public void Section_11_Given_a_credit_rating_When_calculating_Then_wealth_follows_it()
    {
        var sheet = AnAntiquarian().WithSkills(new SkillAllocation(SkillReference.CreditRating, 30, null)).Build();

        var wealth = TestRules.Calculator.Calculate(sheet).Derived.Wealth!;

        Assert.Equal(new MoneyAmount(60m, false), wealth.Cash);
    }

    [Fact]
    public void Section_2_1_and_3_3_Given_standard_rolling_at_45_When_calculating_Then_age_effects_apply_to_the_rolled_values()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAge(45)
            .WithCharacteristicRolls(CharacteristicCodes.All.ToDictionary(characteristic => characteristic, _ => (int?)10))
            .WithDeduction(Characteristic.Strength, 5)
            .WithEduImprovementChecks(new EduImprovementCheckInput(10, null), new EduImprovementCheckInput(10, null))
            .Build();

        var computation = TestRules.Calculator.Calculate(sheet);

        Assert.Equal(50, computation.AssignedCharacteristics[Characteristic.Strength]);
        Assert.Equal(45, computation.FinalCharacteristics[Characteristic.Strength]);
        Assert.Equal(80, computation.AssignedCharacteristics[Characteristic.Size]);
        Assert.Equal(45, computation.FinalCharacteristics[Characteristic.Appearance]);
    }

    [Fact]
    public void Section_18_Given_quick_fire_skills_When_calculating_Then_occupation_values_replace_the_base_and_interests_add_to_it()
    {
        var sheet = AnAntiquarian()
            .WithQuickFireCharacteristics(CharacteristicCodes.All.Zip(QuickFireRules.CharacteristicValues)
                .ToDictionary(pair => pair.First, pair => (int?)pair.Second))
            .WithQuickFireSkills(new QuickFireSkills(
                [new QuickFireSkillValue(Skill("Library Use"), 70), new QuickFireSkillValue(SkillReference.CreditRating, 30)],
                [Skill("Drive Auto")]))
            .Build();

        var computation = TestRules.Calculator.Calculate(sheet);

        Assert.Equal(70, Row(computation, Skill("Library Use")).Value);
        Assert.Equal(40, Row(computation, Skill("Drive Auto")).Value);
        Assert.Equal(30, computation.Derived.CreditRating);
        Assert.Null(computation.Derived.OccupationPoints);
        Assert.Null(computation.Derived.PersonalInterestPoints);
    }

    [Fact]
    public void Section_7_Given_a_custom_occupation_When_calculating_Then_its_formula_and_skills_apply()
    {
        var custom = new CustomOccupation("Bootlegger", "EDUx2+DEXx2", [Skill("Drive Auto"), Skill("Fast Talk")], 5, 30);
        var sheet = new CharacterSheetBuilder().WithOccupation(new OccupationSelection(null, custom, [], [])).Build();

        var computation = TestRules.Calculator.Calculate(sheet);

        Assert.True(computation.Occupation!.IsCustom);
        Assert.Equal(220, computation.Derived.OccupationPoints!.Budget);
        Assert.Equal([Skill("Drive Auto"), Skill("Fast Talk")], computation.Occupation.OccupationSkills);
    }
}
