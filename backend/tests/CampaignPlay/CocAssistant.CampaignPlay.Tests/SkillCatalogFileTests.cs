namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Guards docs/game-rules/catalogs/skills.1920s.json, the 1920s skill bases moved out of section 6.1 of
/// docs/game-rules/coc7_character_creation_and_development_rules.md. Loaded at runtime through IEraRuleData.Skills.
/// </summary>
public class SkillCatalogFileTests
{
    private static JsonElement LoadCatalog()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docs", "game-rules", "catalogs", "skills.1920s.json")))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);
        var json = File.ReadAllText(Path.Combine(directory!.FullName, "docs", "game-rules", "catalogs", "skills.1920s.json"));
        return JsonDocument.Parse(json).RootElement.Clone();
    }

    private static JsonElement Entry(JsonElement catalog, string name) =>
        catalog.GetProperty("entries").EnumerateArray().Single(entry => entry.GetProperty("data").GetProperty("name").GetString() == name);

    [Fact]
    public void Given_the_1920s_skill_catalog_When_reading_its_envelope_Then_it_is_a_version_2_skill_catalog_for_the_1920s()
    {
        var catalog = LoadCatalog();

        Assert.Equal("SkillCatalog", catalog.GetProperty("catalog").GetString());
        Assert.Equal("1920s", catalog.GetProperty("era").GetString());
        Assert.Equal(2, catalog.GetProperty("schemaVersion").GetInt32());
    }

    [Fact]
    public void Given_the_1920s_skill_catalog_When_reading_its_entries_Then_every_section_6_1_skill_is_present_once()
    {
        var entries = LoadCatalog().GetProperty("entries").EnumerateArray().ToList();

        Assert.Equal(46, entries.Count);
        Assert.Equal(entries.Count, entries.Select(entry => entry.GetProperty("id").GetString()).Distinct().Count());
        Assert.All(entries, entry => Assert.Equal("1920s", entry.GetProperty("era").GetString()));
    }

    // Section 6.1: Accounting 5, Dodge half DEX, Language (Own) EDU.
    [Fact]
    public void Given_the_1920s_skill_catalog_When_reading_fixed_and_characteristic_bases_Then_they_match_section_6_1()
    {
        var catalog = LoadCatalog();

        var accounting = Entry(catalog, "Accounting").GetProperty("data").GetProperty("base");
        Assert.Equal("fixed", accounting.GetProperty("kind").GetString());
        Assert.Equal(5, accounting.GetProperty("value").GetInt32());

        var dodge = Entry(catalog, "Dodge").GetProperty("data").GetProperty("base");
        Assert.Equal("characteristic", dodge.GetProperty("kind").GetString());
        Assert.Equal("DEX", dodge.GetProperty("characteristic").GetString());
        Assert.Equal(2, dodge.GetProperty("divisor").GetInt32());

        var ownLanguage = Entry(catalog, "Language (Own)").GetProperty("data").GetProperty("base");
        Assert.Equal("EDU", ownLanguage.GetProperty("characteristic").GetString());
        Assert.False(ownLanguage.TryGetProperty("divisor", out _));
    }
}
