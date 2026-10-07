namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Loading the skill, specialization, and wealth catalogs (docs/game-rules/catalogs/skills.1920s.json for section 6.1,
/// skill-specializations.json for section 6.2, and wealth.1920s.json for section 11). Expected values are taken from
/// those files.
/// </summary>
public class SkillAndWealthCatalogLoadingTests
{
    [Fact]
    public void Section_6_1_Given_the_1920s_rule_data_When_loading_skills_Then_fixed_and_characteristic_bases_are_read()
    {
        var skills = EmbeddedResourceEraRuleData.For1920s().Skills;

        Assert.Equal(Era.The1920s, skills.Era);
        Assert.Equal(46, skills.Skills.Count);
        Assert.Equal(SkillBase.Fixed(5), skills.Find(new SkillReference("Accounting"))!.Base);
        Assert.Equal(SkillBase.FromCharacteristic(Characteristic.Dexterity, 2), skills.Find(new SkillReference("Dodge"))!.Base);
        Assert.Equal(SkillBase.FromCharacteristic(Characteristic.Education, 1), skills.Find(new SkillReference("Language (Own)"))!.Base);
    }

    [Fact]
    public void Section_6_1_Given_the_1920s_skills_When_reading_a_specialized_sheet_entry_Then_it_is_the_skill_with_its_specialization()
    {
        var skills = EmbeddedResourceEraRuleData.For1920s().Skills;

        Assert.Equal(SkillBase.Fixed(25), skills.Find(new SkillReference("Fighting", "Brawl"))!.Base);
        Assert.Null(skills.Find(new SkillReference("Fighting (Brawl)")));
    }

    [Fact]
    public void Section_6_2_Given_the_specialization_catalog_When_loading_it_Then_closed_families_have_bases_and_open_families_are_listed()
    {
        var specializations = new EmbeddedResourceCreationRuleData().SkillSpecializations;

        Assert.Equal(15, specializations.ClosedFamilies["Firearms"]["Bow"]);
        Assert.Equal(20, specializations.ClosedFamilies["Fighting"]["Sword"]);
        Assert.Equal(["Art/Craft", "Language (Other)", "Pilot", "Science", "Survival"], specializations.OpenFamilies);
    }

    [Fact]
    public void Section_11_Given_the_1920s_rule_data_When_loading_wealth_Then_the_bands_keep_the_published_bounds()
    {
        var wealth = EmbeddedResourceEraRuleData.For1920s().Wealth;

        Assert.Equal("USD", wealth.Currency);
        Assert.Equal(6, wealth.Bands.Count);
        Assert.Null(wealth.Bands[0].CreditRatingMinimum);
        Assert.Equal(0, wealth.Bands[0].CreditRatingMaximum);
        Assert.Equal(MoneyRule.None, wealth.Bands[0].Assets);
        Assert.Equal(MoneyRule.FixedAmount(5000000m, orMore: true), wealth.Bands[^1].Assets);
        Assert.Equal(MoneyRule.PerCreditRating(500m), wealth.Bands[3].Assets);
    }

    [Fact]
    public void Project_ruleset_4_2_Given_the_catalogs_When_suggesting_specializations_Then_closed_families_list_theirs_and_open_families_take_the_occupation_catalog_names()
    {
        var suggestions = SpecializationSuggestions.From(TestRules.The1920s);

        Assert.Contains("Bow", suggestions["Firearms"]);
        Assert.Equal(["Acting", "Literature", "Photography"], suggestions["Art/Craft"]);
        Assert.Equal(["Latin"], suggestions["Language (Other)"]);
        Assert.Equal(["Biology", "Pharmacy"], suggestions["Science"]);
        Assert.Empty(suggestions["Pilot"]);
    }
}
