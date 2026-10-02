namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Character Sheet validation for identity, Creation Method, and Point Buy
/// (docs/game-rules/coc7_character_creation_and_development_rules.md sections 1.1, 2.2, and 15;
/// docs/game-rules/project_ruleset.md section 4.1). Codes and messages: specs/character-sheet/spec.md, Validation.
/// </summary>
public class CharacterSheetValidatorTests
{
    private static readonly AllowedCreationMethods PointBuyAllowed = AllowedCreationMethods.Create([CreationMethod.PointBuy]);

    private static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();
    private static readonly CharacterSheetCalculator Calculator = new(RuleData.AgeRules, RuleData.CharacteristicsRules);

    private static IReadOnlyList<ValidationError> Validate(CharacterSheet sheet, AllowedCreationMethods? allowed = null) =>
        CharacterSheetValidator.Validate(sheet, allowed ?? PointBuyAllowed, Calculator.Calculate(sheet));

    private static CharacterSheetBuilder APointBuySheet() => new();

    [Fact]
    public void Given_a_valid_point_buy_sheet_When_validating_Then_there_are_no_problems()
    {
        Assert.Empty(Validate(APointBuySheet().Build()));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Given_no_investigator_name_When_validating_Then_the_name_is_required(string? name)
    {
        var error = Assert.Single(Validate(APointBuySheet().WithName(name).Build()));

        Assert.Equal(new ValidationError(
            "InvestigatorNameRequired", "identity.name", "Enter your Investigator's name.", null, null, ValidationSeverity.Error), error);
    }

    [Fact]
    public void Section_15_Given_no_age_When_validating_Then_the_age_is_required()
    {
        var error = Assert.Single(Validate(APointBuySheet().WithAge(null).Build()));

        Assert.Equal("AgeRequired", error.Code);
        Assert.Equal("identity.age", error.Field);
    }

    [Theory]
    [InlineData(14)]
    [InlineData(90)]
    public void Project_ruleset_4_1_Given_an_age_outside_the_range_When_validating_Then_it_is_rejected(int age)
    {
        var error = Assert.Single(Validate(APointBuySheet().WithAge(age).Build()));

        Assert.Equal(new ValidationError(
            "AgeOutOfRange", "identity.age", "Age must be between 15 and 89.", "15-89", age.ToString(), ValidationSeverity.Error), error);
    }

    [Theory]
    [InlineData(15)]
    [InlineData(89)]
    public void Project_ruleset_4_1_Given_an_age_at_the_edge_of_the_range_When_validating_Then_the_age_is_accepted(int age)
    {
        Assert.DoesNotContain(Validate(APointBuySheet().WithAge(age).Build()), error => error.Field == "identity.age");
    }

    [Fact]
    public void Section_15_Given_no_creation_method_When_validating_Then_it_is_required_and_point_buy_checks_are_skipped()
    {
        var sheet = APointBuySheet().WithCreationMethod(null).WithAssigned(Characteristic.Strength, 99).Build();

        var error = Assert.Single(Validate(sheet));

        Assert.Equal("CreationMethodRequired", error.Code);
        Assert.Equal("creationMethod", error.Field);
    }

    // Scenario: Disallowed Creation Method blocks submission
    [Fact]
    public void Given_a_creation_method_the_campaign_no_longer_allows_When_validating_Then_it_is_rejected()
    {
        var allowed = AllowedCreationMethods.Create([CreationMethod.StandardRolling, CreationMethod.QuickFire]);

        var error = Assert.Single(Validate(APointBuySheet().Build(), allowed));

        Assert.Equal(new ValidationError(
            "CreationMethodNotAllowed",
            "creationMethod",
            "This Campaign no longer allows this creation method. Ask your Keeper.",
            "StandardRolling, QuickFire",
            "PointBuy",
            ValidationSeverity.Error), error);
    }

    [Fact]
    public void Section_15_Given_a_missing_characteristic_When_validating_Then_it_is_required_and_the_total_is_not_reported()
    {
        var error = Assert.Single(Validate(APointBuySheet().WithAssigned(Characteristic.Intelligence, null).Build()));

        Assert.Equal(new ValidationError(
            "CharacteristicRequired", "characteristics.INT", "Enter a value for INT.", null, null, ValidationSeverity.Error), error);
    }

    [Theory]
    [InlineData(14, 76)]
    [InlineData(91, 29)]
    public void Section_2_2_Given_a_value_outside_the_bounds_When_validating_Then_it_is_out_of_range(int strength, int constitution)
    {
        var sheet = APointBuySheet()
            .WithAssigned(Characteristic.Strength, strength)
            .WithAssigned(Characteristic.Constitution, constitution)
            .WithAssigned(Characteristic.Dexterity, strength == 14 ? 90 : 60)
            .Build();

        var error = Assert.Single(Validate(sheet));

        Assert.Equal(new ValidationError(
            "PointBuyValueOutOfRange", "characteristics.STR", "STR must be between 15 and 90.", "15-90", strength.ToString(), ValidationSeverity.Error), error);
    }

    [Fact]
    public void Section_2_2_Given_values_that_do_not_add_up_to_the_budget_When_validating_Then_the_total_is_reported()
    {
        var error = Assert.Single(Validate(APointBuySheet().WithAssigned(Characteristic.Education, 40).Build()));

        Assert.Equal(new ValidationError(
            "PointBuyTotalMismatch",
            "characteristics",
            "Your characteristics must add up to 460. They add up to 450.",
            "460",
            "450",
            ValidationSeverity.Error), error);
    }

    [Fact]
    public void Section_2_2_Given_INT_and_SIZ_below_the_recommendation_When_validating_Then_both_only_warn()
    {
        var sheet = APointBuySheet()
            .WithAssigned(Characteristic.Intelligence, 35)
            .WithAssigned(Characteristic.Size, 35)
            .WithAssigned(Characteristic.Strength, 90)
            .WithAssigned(Characteristic.Constitution, 80)
            .Build();

        var problems = Validate(sheet);

        Assert.All(problems, problem => Assert.Equal(ValidationSeverity.Warning, problem.Severity));
        Assert.Equal(
            [
                new ValidationError("PointBuyBelowRecommendation", "characteristics.INT", "INT is below the recommended 40. Check with your Keeper.", "40", "35", ValidationSeverity.Warning),
                new ValidationError("PointBuyBelowRecommendation", "characteristics.SIZ", "SIZ is below the recommended 40. Check with your Keeper.", "40", "35", ValidationSeverity.Warning),
            ],
            problems.OrderBy(problem => problem.Field).ToList());
    }

    [Fact]
    public void Project_ruleset_4_4_Given_a_deduction_that_takes_a_characteristic_exactly_to_the_floor_When_validating_Then_it_is_accepted()
    {
        var sheet = APointBuySheet()
            .WithAge(65)
            .WithAssigned(Characteristic.Strength, 20)
            .WithAssigned(Characteristic.Constitution, 90)
            .WithAssigned(Characteristic.Dexterity, 90)
            .WithAssigned(Characteristic.Appearance, 60)
            .WithAssigned(Characteristic.Intelligence, 50)
            .WithAssigned(Characteristic.Education, 30)
            .WithDeduction(Characteristic.Strength, 20)
            .WithEduImprovementChecks(
                new EduImprovementCheckInput(10, null),
                new EduImprovementCheckInput(20, null),
                new EduImprovementCheckInput(5, null),
                new EduImprovementCheckInput(25, null))
            .Build();

        Assert.Empty(Validate(sheet));
        Assert.Equal(0, Calculator.Calculate(sheet).FinalCharacteristics[Characteristic.Strength]);
    }

    [Fact]
    public void Section_2_2_Given_a_characteristic_other_than_INT_or_SIZ_below_40_When_validating_Then_it_does_not_warn()
    {
        var sheet = APointBuySheet()
            .WithAssigned(Characteristic.Appearance, 35)
            .WithAssigned(Characteristic.Education, 65)
            .Build();

        Assert.Empty(Validate(sheet));
    }
}
