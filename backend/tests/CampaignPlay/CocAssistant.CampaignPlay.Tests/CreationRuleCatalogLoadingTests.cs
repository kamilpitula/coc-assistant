namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Loading the creation rule catalogs (ADR 0006 amendment): docs/game-rules/catalogs/age-rules.json (section 3.1 data)
/// and docs/game-rules/catalogs/characteristics-rules.json (section 5.8 data). Expected values come from those files.
/// </summary>
public class CreationRuleCatalogLoadingTests
{
    private static readonly ICreationRuleData RuleData = new EmbeddedResourceCreationRuleData();

    [Fact]
    public void Section_3_1_Given_age_45_When_finding_its_bracket_Then_it_deducts_5_from_STR_CON_DEX_with_APP_minus_5_and_two_EDU_checks()
    {
        var bracket = RuleData.AgeRules.BracketFor(45);

        Assert.NotNull(bracket);
        Assert.Equal(40, bracket.MinimumAge);
        Assert.Equal(49, bracket.MaximumAge);
        Assert.Equal(5, bracket.PhysicalDeductionTotal);
        Assert.Equal([Characteristic.Strength, Characteristic.Constitution, Characteristic.Dexterity], bracket.PhysicalDeductionCharacteristics);
        Assert.Equal(-5, bracket.AppearanceModifier);
        Assert.Equal(2, bracket.EduImprovementChecks);
        Assert.Equal(1, bracket.LuckRolls);
    }

    [Fact]
    public void Section_3_1_Given_age_17_When_finding_its_bracket_Then_it_deducts_from_STR_and_SIZ_with_no_EDU_checks_and_two_luck_rolls()
    {
        var bracket = RuleData.AgeRules.BracketFor(17)!;

        Assert.Equal(5, bracket.PhysicalDeductionTotal);
        Assert.Equal([Characteristic.Strength, Characteristic.Size], bracket.PhysicalDeductionCharacteristics);
        Assert.Equal(0, bracket.AppearanceModifier);
        Assert.Equal(0, bracket.EduImprovementChecks);
        Assert.Equal(2, bracket.LuckRolls);
    }

    [Theory]
    [InlineData(15, 15)]
    [InlineData(19, 15)]
    [InlineData(20, 20)]
    [InlineData(39, 20)]
    [InlineData(89, 80)]
    public void Section_3_1_Given_an_age_at_a_bracket_edge_When_finding_its_bracket_Then_the_applicable_bracket_is_returned(int age, int bracketStart)
    {
        Assert.Equal(bracketStart, RuleData.AgeRules.BracketFor(age)?.MinimumAge);
    }

    [Theory]
    [InlineData(14)]
    [InlineData(90)]
    public void Section_3_1_Given_an_age_without_an_automatic_bracket_When_finding_its_bracket_Then_there_is_none(int age)
    {
        Assert.Null(RuleData.AgeRules.BracketFor(age));
    }

    [Fact]
    public void Section_5_8_Given_the_characteristics_rules_When_loading_Then_the_damage_bonus_table_has_its_nine_bands()
    {
        var bands = RuleData.CharacteristicsRules.DamageBonusAndBuild;

        Assert.Equal(9, bands.Count);
        Assert.Equal(new DamageBonusAndBuildBand(85, 124, "0", 0), bands[2]);
        Assert.Equal(new DamageBonusAndBuildBand(445, 524, "+5D6", 6), bands[8]);
    }

    [Fact]
    public void Given_a_catalog_of_another_kind_When_reading_it_as_age_rules_Then_it_is_rejected()
    {
        const string json = """{ "catalog": "OccupationCatalog", "schemaVersion": 1, "entries": [] }""";
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        Assert.Throws<InvalidOperationException>(() => CreationRuleCatalogReader.ReadAgeRules(stream));
    }
}
