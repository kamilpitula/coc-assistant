namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Loading the 1920s Occupation catalog (docs/game-rules/catalogs/occupations.1920s.json, section 7 data).
/// Expected values are taken from that catalog file.
/// </summary>
public class OccupationCatalogLoadingTests
{
    private static OccupationCatalog Load1920s() => EmbeddedResourceEraRuleData.For1920s().Occupations;

    [Fact]
    public void Given_the_1920s_rule_data_When_loading_occupations_Then_the_catalog_is_for_the_1920s()
    {
        var catalog = Load1920s();

        Assert.Equal(Era.The1920s, catalog.Era);
        Assert.Equal(10, catalog.Occupations.Count);
    }

    [Fact]
    public void Given_the_1920s_catalog_When_reading_the_antiquarian_Then_its_credit_rating_and_point_formula_match_the_catalog()
    {
        var antiquarian = Load1920s().Occupations.Single(occupation => occupation.Id == "antiquarian");

        Assert.Equal("Antiquarian", antiquarian.Name);
        Assert.Equal(30, antiquarian.CreditRatingMin);
        Assert.Equal(70, antiquarian.CreditRatingMax);
        var term = Assert.Single(antiquarian.OccupationPointFormula.Terms);
        Assert.Equal(["EDU"], term.Characteristics);
        Assert.Equal(4, term.Multiplier);
        Assert.Equal(new OccupationSkillSlot(OccupationSkillSlotKind.Group, Choose: 1, Group: "interpersonal"), antiquarian.SkillSlots[5]);
    }

    [Fact]
    public void Given_the_1920s_catalog_When_reading_a_choice_slot_Then_its_options_are_loaded()
    {
        var author = Load1920s().Occupations.Single(occupation => occupation.Id == "author");

        var choice = author.SkillSlots.Single(slot => slot.Kind == OccupationSkillSlotKind.Choice);

        Assert.Equal(1, choice.Choose);
        Assert.Equal(["Natural World", "Occult"], choice.From!.Select(slot => slot.Skill));
    }

    [Fact]
    public void Given_the_1920s_catalog_When_reading_skill_groups_Then_the_interpersonal_group_is_loaded()
    {
        var interpersonal = Load1920s().SkillGroups["interpersonal"];

        Assert.Equal(["Charm", "Fast Talk", "Intimidate", "Persuade"], interpersonal.Select(slot => slot.Skill));
    }

    [Fact]
    public void Given_a_catalog_for_another_era_When_reading_it_as_the_1920s_Then_it_is_rejected()
    {
        const string json = """{ "catalog": "OccupationCatalog", "era": "1890s", "schemaVersion": 1, "skillGroups": {}, "entries": [] }""";
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        Assert.Throws<InvalidOperationException>(() => OccupationCatalogReader.Read(stream, Era.The1920s));
    }

    [Fact]
    public void Given_a_catalog_with_an_unknown_schema_version_When_reading_it_Then_it_is_rejected()
    {
        const string json = """{ "catalog": "OccupationCatalog", "era": "1920s", "schemaVersion": 2, "skillGroups": {}, "entries": [] }""";
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        Assert.Throws<InvalidOperationException>(() => OccupationCatalogReader.Read(stream, Era.The1920s));
    }
}
