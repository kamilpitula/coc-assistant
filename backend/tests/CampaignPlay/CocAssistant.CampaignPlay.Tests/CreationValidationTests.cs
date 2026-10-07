namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Validation of the PBI-CP-009 inputs: Standard Rolling and Quick Fire characteristics, the Occupation, skill
/// allocations, budgets, Credit Rating, and the Quick Fire skills
/// (docs/game-rules/coc7_character_creation_and_development_rules.md sections 2.1, 2.3, 6, 7, 8, 15, and 18;
/// docs/game-rules/project_ruleset.md sections 4.2, 4.5, and 4.6). Codes and messages: specs/character-sheet/spec.md,
/// Validation.
/// </summary>
public class CreationValidationTests
{
    private static SkillReference Skill(string name, string? specialization = null) => new(name, specialization);

    private static IReadOnlyList<ValidationError> Validate(CharacterSheetBuilder builder) =>
        TestRules.Validate(builder.Build(), AllowedCreationMethods.All);

    private static ValidationError Error(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Error);

    private static ValidationError Warning(string code, string field, string message, string? expected = null, string? actual = null) =>
        new(code, field, message, expected, actual, ValidationSeverity.Warning);

    // Raw totals giving STR 60, CON 60, DEX 60, APP 50, POW 60, SIZ 60, INT 60, EDU 50 (section 2.1).
    private static readonly IReadOnlyDictionary<Characteristic, int?> ValidRolls = new Dictionary<Characteristic, int?>
    {
        [Characteristic.Strength] = 12,
        [Characteristic.Constitution] = 12,
        [Characteristic.Dexterity] = 12,
        [Characteristic.Appearance] = 10,
        [Characteristic.Power] = 12,
        [Characteristic.Size] = 6,
        [Characteristic.Intelligence] = 6,
        [Characteristic.Education] = 4,
    };

    private static readonly IReadOnlyDictionary<Characteristic, int?> QuickFireCharacteristics = new Dictionary<Characteristic, int?>
    {
        [Characteristic.Strength] = 50,
        [Characteristic.Constitution] = 60,
        [Characteristic.Dexterity] = 50,
        [Characteristic.Appearance] = 40,
        [Characteristic.Power] = 60,
        [Characteristic.Size] = 50,
        [Characteristic.Intelligence] = 80,
        [Characteristic.Education] = 70,
    };

    // The Antiquarian's minimum of 30 is below 40, so Credit Rating is 30 and the freed 40 goes to Drive Auto (section 18).
    private static readonly IReadOnlyList<QuickFireSkillValue> ValidQuickFireValues =
    [
        new(SkillReference.CreditRating, 30),
        new(Skill("Appraise"), 70),
        new(Skill("Art/Craft", "Painting"), 60),
        new(Skill("History"), 60),
        new(Skill("Library Use"), 50),
        new(Skill("Language (Other)", "Latin"), 50),
        new(Skill("Charm"), 50),
        new(Skill("Spot Hidden"), 40),
        new(Skill("Firearms", "Handgun"), 40),
        new(Skill("Drive Auto"), 40),
    ];

    private static readonly IReadOnlyList<SkillReference> ValidPersonalInterests = [Skill("Listen"), Skill("Stealth"), Skill("Psychology"), Skill("Persuade")];

    private static CharacterSheetBuilder AStandardRollingSheet() => new CharacterSheetBuilder().WithCharacteristicRolls(ValidRolls);

    private static CharacterSheetBuilder AQuickFireSheet(IReadOnlyList<QuickFireSkillValue>? values = null, IReadOnlyList<SkillReference>? interests = null) =>
        new CharacterSheetBuilder()
            .WithQuickFireCharacteristics(QuickFireCharacteristics)
            .WithSkills()
            .WithQuickFireSkills(new QuickFireSkills(values ?? ValidQuickFireValues, interests ?? ValidPersonalInterests));

    private static CharacterSheetBuilder WithAllocations(params SkillAllocation[] allocations) => new CharacterSheetBuilder().WithSkills(allocations);

    [Fact]
    public void Section_15_Given_valid_sheets_for_each_creation_method_When_validating_Then_there_are_no_problems()
    {
        Assert.Empty(Validate(new CharacterSheetBuilder()));
        Assert.Empty(Validate(AStandardRollingSheet()));
        Assert.Empty(Validate(AQuickFireSheet()));
    }

    [Fact]
    public void Section_2_1_Given_a_missing_or_impossible_roll_When_validating_Then_each_is_reported_on_its_roll()
    {
        var rolls = new Dictionary<Characteristic, int?>(ValidRolls) { [Characteristic.Strength] = null, [Characteristic.Size] = 13 };

        var errors = Validate(new CharacterSheetBuilder().WithCharacteristicRolls(rolls));

        Assert.Contains(Error("CharacteristicRollRequired", "characteristicRolls.STR", "Enter the 3D6 total for STR."), errors);
        Assert.Contains(Error("DiceResultOutOfRange", "characteristicRolls.SIZ", "Enter a 2D6 result between 2 and 12.", "2-12", "13"), errors);
        Assert.DoesNotContain(errors, error => error.Code == "CharacteristicRequired");
    }

    [Fact]
    public void Section_2_3_Given_a_quick_fire_value_outside_the_pool_When_validating_Then_it_is_reported_on_its_characteristic()
    {
        var values = new Dictionary<Characteristic, int?>(QuickFireCharacteristics) { [Characteristic.Strength] = 45 };

        var errors = Validate(AQuickFireSheet().WithQuickFireCharacteristics(values));

        Assert.Contains(
            Error("QuickFireValueNotInPool", "characteristics.STR", "STR must be one of the Quick fire values: 40, 50, 60, 70, 80.", "40, 50, 60, 70, 80", "45"),
            errors);
        Assert.DoesNotContain(errors, error => error.Code == "QuickFireAssignmentMismatch");
    }

    [Fact]
    public void Section_2_3_Given_pool_values_not_used_exactly_once_When_validating_Then_the_assignment_is_reported()
    {
        var values = new Dictionary<Characteristic, int?>(QuickFireCharacteristics) { [Characteristic.Appearance] = 80 };

        var errors = Validate(AQuickFireSheet().WithQuickFireCharacteristics(values));

        Assert.Contains(
            Error(
                "QuickFireAssignmentMismatch",
                "characteristics",
                "Use each Quick fire value exactly once: 40, 50, 50, 50, 60, 60, 70, 80.",
                "40, 50, 50, 50, 60, 60, 70, 80",
                "50, 50, 50, 60, 60, 70, 80, 80"),
            errors);
    }

    [Fact]
    public void Section_15_Given_no_occupation_When_validating_Then_an_occupation_is_required()
    {
        var errors = Validate(new CharacterSheetBuilder().WithOccupation(null).WithSkills());

        Assert.Contains(Error("OccupationRequired", "occupation", "Choose an occupation."), errors);
    }

    [Fact]
    public void Section_15_Given_an_occupation_outside_the_era_catalog_When_validating_Then_it_is_not_available()
    {
        var errors = Validate(new CharacterSheetBuilder().WithCatalogOccupation("astronaut").WithSkills());

        Assert.Contains(
            Error("OccupationNotAvailable", "occupation.catalogId", "This occupation isn't available in this Campaign's era.", null, "astronaut"),
            errors);
    }

    [Fact]
    public void Section_7_1_Given_a_formula_with_a_choice_and_no_pick_When_validating_Then_the_choice_is_required()
    {
        var errors = Validate(new CharacterSheetBuilder().WithCatalogOccupation("police-detective", [null, null]));

        Assert.Contains(
            Error("OccupationFormulaChoiceRequired", "occupation.formulaCharacteristics[1]", "Choose which characteristic your occupation points use.", "DEX, STR", null),
            errors);
    }

    [Fact]
    public void Section_7_Given_an_incomplete_custom_occupation_When_validating_Then_each_missing_part_is_reported()
    {
        var custom = new CustomOccupation(" ", "EDUx3", [Skill("Drive Auto"), null], 40, 20);

        var errors = Validate(new CharacterSheetBuilder().WithOccupation(new OccupationSelection(null, custom, [], [])).WithSkills());

        Assert.Contains(Error("CustomOccupationNameRequired", "occupation.custom.name", "Enter a name for your occupation."), errors);
        Assert.Contains(Error("CustomOccupationFormulaNotAllowed", "occupation.custom.formulaId", "Choose a point formula from the list.", null, "EDUx3"), errors);
        Assert.Contains(Error("CustomOccupationSkillRequired", "occupation.custom.skills[1]", "Choose occupation skill 2."), errors);
        Assert.Contains(Error("CustomOccupationSkillRequired", "occupation.custom.skills[7]", "Choose occupation skill 8."), errors);
        Assert.Contains(
            Error(
                "CustomOccupationCreditRatingRangeInvalid",
                "occupation.custom.creditRating",
                "Enter a Credit Rating range between 0 and 99, with the minimum no higher than the maximum.",
                "0-99",
                "40-20"),
            errors);
    }

    [Fact]
    public void Section_7_2_Given_an_open_slot_without_picks_When_validating_Then_its_choice_is_required()
    {
        var choices = BuilderChoices();
        choices[5] = [];

        var errors = Validate(new CharacterSheetBuilder().WithCatalogOccupation("antiquarian", null, choices));

        Assert.Contains(
            Error("OccupationSkillChoiceRequired", "occupation.skillChoices[5]", "Choose 1 skill for this part of your occupation.", "1", "0"),
            errors);
    }

    [Theory]
    [InlineData(5, "Library Use")]
    [InlineData(7, "History")]
    [InlineData(7, "Cthulhu Mythos")]
    [InlineData(7, "Basket Weaving")]
    public void Project_ruleset_4_5_Given_a_pick_the_slot_does_not_allow_When_validating_Then_it_is_not_allowed(int slot, string skill)
    {
        var choices = BuilderChoices();
        choices[slot] = [Skill(skill)];

        var errors = Validate(new CharacterSheetBuilder().WithCatalogOccupation("antiquarian", null, choices).WithSkills());

        Assert.Contains(
            Error(
                "OccupationSkillChoiceNotAllowed",
                $"occupation.skillChoices[{slot}][0]",
                "Choose a skill this occupation allows that isn't already one of its skills.",
                null,
                skill),
            errors);
    }

    [Fact]
    public void Section_6_Given_specialized_skills_without_or_with_an_unlisted_specialization_When_validating_Then_each_is_reported()
    {
        var choices = BuilderChoices();
        choices[1] = [Skill("Art/Craft")];
        choices[7] = [Skill("Firearms", "Laser")];

        var errors = Validate(new CharacterSheetBuilder().WithCatalogOccupation("antiquarian", null, choices).WithSkills());

        Assert.Contains(Error("SpecializationRequired", "occupation.skillChoices[1][0].specialization", "Enter a specialization for Art/Craft."), errors);
        Assert.Contains(
            Error("SpecializationNotAllowed", "occupation.skillChoices[7][0].specialization", "Choose a Firearms specialization from the list.", null, "Laser"),
            errors);
    }

    [Fact]
    public void Section_6_1_Given_points_on_a_skill_that_is_not_in_the_catalog_When_validating_Then_it_is_unknown()
    {
        var errors = Validate(WithAllocations([.. CharacterSheetBuilder.ValidAllocations, new SkillAllocation(Skill("Basket Weaving"), null, 0)]));

        Assert.Contains(Error("UnknownSkill", "skills[7].skill", "Choose a skill from the list.", null, "Basket Weaving"), errors);
    }

    [Fact]
    public void Section_7_2_and_8_Given_negative_points_When_validating_Then_each_is_reported_on_its_column()
    {
        var errors = Validate(WithAllocations([.. CharacterSheetBuilder.ValidAllocations, new SkillAllocation(Skill("Swim"), -5, -1)]));

        Assert.Contains(Error("SkillPointsNegative", "skills[7].occupationPoints", "Enter 0 or more points for Swim.", null, "-5"), errors);
        Assert.Contains(Error("SkillPointsNegative", "skills[7].personalInterestPoints", "Enter 0 or more points for Swim.", null, "-1"), errors);
    }

    [Fact]
    public void Section_8_Given_points_on_cthulhu_mythos_When_validating_Then_they_are_rejected()
    {
        var errors = Validate(WithAllocations([.. CharacterSheetBuilder.ValidAllocations, new SkillAllocation(SkillReference.CthulhuMythos, 5, 10)]));

        Assert.Contains(Error("CreationPointsOnCthulhuMythos", "skills[7].occupationPoints", "Cthulhu Mythos can't take points at creation.", null, "5"), errors);
        Assert.Contains(Error("CreationPointsOnCthulhuMythos", "skills[7].personalInterestPoints", "Cthulhu Mythos can't take points at creation.", null, "10"), errors);
    }

    [Fact]
    public void Project_ruleset_4_6_Given_personal_interest_points_on_credit_rating_When_validating_Then_they_are_rejected()
    {
        var allocations = CharacterSheetBuilder.ValidAllocations.ToArray();
        allocations[0] = new SkillAllocation(SkillReference.CreditRating, 30, 10);

        var errors = Validate(WithAllocations(allocations));

        Assert.Contains(
            Error("PersonalInterestPointsOnCreditRating", "skills[0].personalInterestPoints", "Credit Rating can only take occupation points.", null, "10"),
            errors);
    }

    [Fact]
    public void Section_7_2_Given_occupation_points_on_a_skill_outside_the_occupation_When_validating_Then_they_are_rejected()
    {
        var allocations = CharacterSheetBuilder.ValidAllocations.ToArray();
        allocations[5] = new SkillAllocation(Skill("Drive Auto"), 10, 60);

        var errors = Validate(WithAllocations(allocations));

        Assert.Contains(
            Error("OccupationPointsOutsideOccupationSkills", "skills[5].occupationPoints", "Drive Auto isn't one of your occupation skills.", null, "10"),
            errors);
    }

    [Fact]
    public void Section_7_1_and_8_Given_overspent_budgets_When_validating_Then_each_is_an_error()
    {
        var errors = Validate(WithAllocations([.. CharacterSheetBuilder.ValidAllocations, new SkillAllocation(Skill("Charm"), 10, 5)]));

        Assert.Contains(Error("OccupationPointsOverspent", "occupationPoints", "You've spent 210 occupation points. You have 200.", "200", "210"), errors);
        Assert.Contains(Error("PersonalInterestPointsOverspent", "personalInterestPoints", "You've spent 125 personal interest points. You have 120.", "120", "125"), errors);
    }

    [Fact]
    public void Section_7_2_and_8_Given_unspent_budgets_When_validating_Then_each_only_warns()
    {
        var errors = Validate(WithAllocations(new SkillAllocation(SkillReference.CreditRating, 30, null)));

        Assert.Equal(
            [
                Warning("OccupationPointsUnspent", "occupationPoints", "You have 170 occupation points left. Unspent points are lost.", "200", "30"),
                Warning("PersonalInterestPointsUnspent", "personalInterestPoints", "You have 120 personal interest points left. Unspent points are lost.", "120", "0"),
            ],
            errors);
    }

    [Fact]
    public void Section_7_3_Given_a_credit_rating_outside_the_occupation_range_When_validating_Then_it_is_rejected()
    {
        var allocations = CharacterSheetBuilder.ValidAllocations.ToArray();
        allocations[0] = new SkillAllocation(SkillReference.CreditRating, 20, null);
        allocations[4] = new SkillAllocation(Skill("Spot Hidden"), 30, null);

        var errors = Validate(WithAllocations(allocations));

        Assert.Equal([Error("CreditRatingOutOfRange", "creditRating", "Credit Rating must be between 30 and 70.", "30-70", "20")], errors);
    }

    [Fact]
    public void Ux_section_12_Given_a_skill_above_90_When_validating_Then_it_warns()
    {
        var errors = Validate(WithAllocations(
            new SkillAllocation(SkillReference.CreditRating, 30, null),
            new SkillAllocation(Skill("Library Use"), 50, 30),
            new SkillAllocation(Skill("Appraise"), 50, null),
            new SkillAllocation(Skill("History"), 50, null),
            new SkillAllocation(Skill("Spot Hidden"), 20, null),
            new SkillAllocation(Skill("Listen"), null, 90)));

        Assert.Equal(
            [
                Warning("SkillAboveWarningThreshold", "skills", "Library Use is above 90. Check with your Keeper.", "90", "100"),
                Warning("SkillAboveWarningThreshold", "skills", "Listen is above 90. Check with your Keeper.", "90", "110"),
            ],
            errors.OrderBy(error => error.Message).ToList());
    }

    [Fact]
    public void Section_18_Given_a_quick_fire_skill_value_outside_the_pool_When_validating_Then_it_is_reported()
    {
        var values = ValidQuickFireValues.ToArray();
        values[1] = new QuickFireSkillValue(Skill("Appraise"), 45);

        var errors = Validate(AQuickFireSheet(values));

        Assert.Contains(
            Error("QuickFireSkillValueNotInPool", "quickFire.values[1].value", "Use one of the Quick fire skill values: 70, 60, 50, 40.", "70, 60, 50, 40", "45"),
            errors);
    }

    [Fact]
    public void Section_18_Given_quick_fire_skill_values_not_used_exactly_once_When_validating_Then_the_assignment_is_reported()
    {
        var errors = Validate(AQuickFireSheet(ValidQuickFireValues.Take(9).ToList()));

        Assert.Equal(
            [
                Error(
                    "QuickFireSkillAssignmentMismatch",
                    "quickFire.values",
                    "Use each Quick fire skill value exactly once: 70, 60, 60, 50, 50, 50, 40, 40, 40.",
                    "70, 60, 60, 50, 50, 50, 40, 40, 40",
                    "70, 60, 60, 50, 50, 50, 40, 40"),
            ],
            errors);
    }

    [Fact]
    public void Section_18_Given_a_second_skill_outside_the_occupation_When_validating_Then_it_is_not_an_occupation_skill()
    {
        var errors = Validate(AQuickFireSheet([.. ValidQuickFireValues, new QuickFireSkillValue(Skill("Swim"), 40)]));

        Assert.Contains(Error("QuickFireSkillNotOccupationSkill", "quickFire.values[10].skill", "Swim isn't one of your occupation skills.", null, "Swim"), errors);
    }

    [Fact]
    public void Section_18_Given_credit_rating_without_its_quick_fire_value_When_validating_Then_it_is_reported()
    {
        var values = ValidQuickFireValues.ToArray();
        values[0] = new QuickFireSkillValue(SkillReference.CreditRating, 40);

        var errors = Validate(AQuickFireSheet(values));

        Assert.Contains(Error("QuickFireCreditRatingValue", "creditRating", "Credit Rating must be 30 for this occupation.", "30", "40"), errors);
    }

    [Theory]
    [InlineData("History")]
    [InlineData("Drive Auto")]
    [InlineData("Cthulhu Mythos")]
    [InlineData("Listen")]
    public void Section_18_Given_a_personal_interest_that_is_not_allowed_When_validating_Then_it_is_reported(string skill)
    {
        var errors = Validate(AQuickFireSheet(interests: [Skill("Listen"), Skill("Stealth"), Skill("Psychology"), Skill(skill)]));

        Assert.Contains(
            Error(
                "QuickFirePersonalInterestNotAllowed",
                "quickFire.personalInterests[3]",
                "Choose a skill that isn't an occupation skill, Credit Rating, Cthulhu Mythos, or already chosen.",
                null,
                skill),
            errors);
    }

    [Fact]
    public void Section_18_Given_too_many_or_too_few_personal_interests_When_validating_Then_too_many_is_an_error_and_too_few_warns()
    {
        var tooMany = Validate(AQuickFireSheet(interests: [.. ValidPersonalInterests, Skill("Swim")]));
        var tooFew = Validate(AQuickFireSheet(interests: ValidPersonalInterests.Take(3).ToList()));

        Assert.Contains(
            Error("QuickFirePersonalInterestsTooMany", "quickFire.personalInterests", "Choose 4 personal interest skills. You have chosen 5.", "4", "5"),
            tooMany);
        Assert.Equal(
            [Warning("QuickFirePersonalInterestsUnchosen", "quickFire.personalInterests", "Choose 4 personal interest skills. You have chosen 3.", "4", "3")],
            tooFew);
    }

    [Fact]
    public void Section_7_1_Given_allocated_points_When_EDU_is_lowered_Then_the_allocations_are_kept_and_overspent_is_reported()
    {
        var sheet = new CharacterSheetBuilder()
            .WithAssigned(Characteristic.Education, 40)
            .WithAssigned(Characteristic.Strength, 70)
            .Build();

        var computation = TestRules.Calculator.Calculate(sheet);
        var errors = TestRules.Validate(sheet, AllowedCreationMethods.All);

        Assert.Equal(CharacterSheetBuilder.ValidAllocations, sheet.SkillAllocations);
        Assert.Equal(new PointBudget(160, 200, -40), computation.Derived.OccupationPoints);
        Assert.Contains(Error("OccupationPointsOverspent", "occupationPoints", "You've spent 200 occupation points. You have 160.", "160", "200"), errors);
    }

    private static SkillReference[][] BuilderChoices() =>
        CharacterSheetBuilder.ValidAntiquarian.SkillChoices.Select(picks => picks.ToArray()).ToArray();
}
