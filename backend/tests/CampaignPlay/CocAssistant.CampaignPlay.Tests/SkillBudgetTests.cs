namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Occupation and personal interest budgets, the Quick Fire values, and wealth, one group per rule section of
/// docs/game-rules/coc7_character_creation_and_development_rules.md (sections 7.1, 8, 2.3 and 18, and 11). Expected
/// values are worked by hand from those sections and docs/game-rules/catalogs/wealth.1920s.json.
/// </summary>
public class SkillBudgetTests
{
    private static readonly CharacteristicValues Final = CharacteristicValues.From(new Dictionary<Characteristic, int?>
    {
        [Characteristic.Strength] = 50,
        [Characteristic.Dexterity] = 70,
        [Characteristic.Appearance] = 40,
        [Characteristic.Intelligence] = 65,
        [Characteristic.Education] = 60,
    });

    private static OccupationPointFormula Formula(params (string[] Characteristics, int Multiplier)[] terms) =>
        new(terms.Select(term => new OccupationPointTerm(term.Characteristics, term.Multiplier)).ToList());

    [Fact]
    public void Section_7_1_Given_EDU_x_4_When_calculating_the_budget_Then_it_is_four_times_EDU()
    {
        Assert.Equal(240, OccupationPoints.Budget(Formula((["EDU"], 4)), [], Final));
    }

    [Fact]
    public void Section_7_1_Given_EDU_x_2_plus_APP_x_2_When_calculating_the_budget_Then_both_terms_add_up()
    {
        Assert.Equal(200, OccupationPoints.Budget(Formula((["EDU"], 2), (["APP"], 2)), [], Final));
    }

    [Theory]
    [InlineData("DEX", 260)]
    [InlineData("STR", 220)]
    public void Section_7_1_Given_a_term_with_a_choice_When_the_player_picks_a_characteristic_Then_the_budget_uses_it(string chosen, int expected)
    {
        Assert.Equal(expected, OccupationPoints.Budget(Formula((["EDU"], 2), (["DEX", "STR"], 2)), [null, chosen], Final));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("APP")]
    public void Section_7_1_Given_a_term_with_a_choice_but_no_valid_pick_When_calculating_Then_there_is_no_budget(string? chosen)
    {
        Assert.Null(OccupationPoints.Budget(Formula((["EDU"], 2), (["DEX", "STR"], 2)), [null, chosen], Final));
    }

    [Fact]
    public void Section_7_1_Given_the_common_formulas_When_reading_their_ids_Then_each_id_finds_its_formula()
    {
        Assert.Equal(6, OccupationPointFormulas.Common.Count);
        Assert.Equal("EDUx2+APP|DEX|STRx2", OccupationPointFormulas.IdOf(Formula((["EDU"], 2), (["APP", "DEX", "STR"], 2))));
        Assert.All(OccupationPointFormulas.Common, formula => Assert.Same(formula, OccupationPointFormulas.Find(OccupationPointFormulas.IdOf(formula))));
    }

    [Fact]
    public void Section_8_Given_INT_When_calculating_personal_interest_points_Then_they_are_twice_INT()
    {
        Assert.Equal(130, PersonalInterestPoints.Budget(Final));
        Assert.Null(PersonalInterestPoints.Budget(CharacteristicValues.Empty));
    }

    [Theory]
    [InlineData(50, 50, null)]
    [InlineData(45, 50, null)]
    [InlineData(30, 30, 40)]
    [InlineData(9, 9, 40)]
    [InlineData(75, 75, 70)]
    public void Section_18_Given_an_occupation_credit_rating_minimum_When_assigning_quick_fire_Then_credit_rating_takes_the_closest_value(
        int minimum, int expected, int? freed)
    {
        var assignment = QuickFireRules.CreditRatingFor(minimum);

        Assert.Equal(expected, assignment.Value);
        Assert.Equal(freed, assignment.FreedValue);
    }

    [Fact]
    public void Section_2_3_Given_the_quick_fire_pools_When_reading_them_Then_they_hold_the_published_values()
    {
        Assert.Equal([40, 50, 50, 50, 60, 60, 70, 80], QuickFireRules.CharacteristicValues);
        Assert.Equal([70, 60, 60, 50, 50, 50, 40, 40, 40], QuickFireRules.SkillValues);
    }

    [Theory]
    [InlineData(0, "0.5", "0.5", null, false)]
    [InlineData(5, "2", "5", "50", false)]
    [InlineData(30, "10", "60", "1500", false)]
    [InlineData(60, "50", "300", "30000", false)]
    [InlineData(95, "250", "1900", "190000", false)]
    [InlineData(99, "5000", "50000", "5000000", true)]
    public void Section_11_Given_a_credit_rating_When_calculating_1920s_wealth_Then_it_follows_its_band(
        int creditRating, string spendingLevel, string cash, string? assets, bool assetsOrMore)
    {
        var wealth = Wealth.For(creditRating, EmbeddedResourceEraRuleData.For1920s().Wealth)!;

        Assert.Equal("USD", wealth.Currency);
        Assert.Equal(new MoneyAmount(decimal.Parse(spendingLevel), false), wealth.SpendingLevel);
        Assert.Equal(new MoneyAmount(decimal.Parse(cash), false), wealth.Cash);
        Assert.Equal(assets is null ? null : new MoneyAmount(decimal.Parse(assets), assetsOrMore), wealth.Assets);
    }
}
