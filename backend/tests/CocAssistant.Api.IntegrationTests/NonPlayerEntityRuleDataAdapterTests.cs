namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Scenario Preparation's rule data port, resolved from the assembled application and backed by Campaign Play's creation rule
/// catalogs (ADR 0008, ADR 0017). The expected values are read from the same catalogs; the rules themselves are in
/// docs/game-rules/ (section 5.8 characteristics, section 6.2 specializations) and are not restated here.
/// </summary>
public class NonPlayerEntityRuleDataAdapterTests : IClassFixture<IdentityApiFactory>
{
    private readonly IdentityApiFactory _factory;

    public NonPlayerEntityRuleDataAdapterTests(IdentityApiFactory factory) => _factory = factory;

    [Fact]
    public void Given_the_assembled_application_When_reading_the_rule_data_Then_the_characteristics_rules_pass_through_and_the_combat_families_come_from_the_catalog()
    {
        using var scope = _factory.Services.CreateScope();
        var port = scope.ServiceProvider.GetRequiredService<INonPlayerEntityRuleData>();
        var catalog = scope.ServiceProvider.GetRequiredService<ICreationRuleData>();

        Assert.Same(catalog.CharacteristicsRules, port.CharacteristicsRules);
        Assert.Equal(catalog.SkillSpecializations.ClosedFamilies["Fighting"].Keys, port.CombatSkillSpecializations.Fighting);
        Assert.Equal(catalog.SkillSpecializations.ClosedFamilies["Firearms"].Keys, port.CombatSkillSpecializations.Firearms);
        Assert.NotEmpty(port.CombatSkillSpecializations.Fighting);
        Assert.NotEmpty(port.CombatSkillSpecializations.Firearms);
    }

    [Theory]
    [InlineData("FIGHTING", "FIREARMS")]
    [InlineData("fighting", "firearms")]
    public void Given_family_names_in_another_case_When_reading_the_specializations_Then_they_match_ignoring_case(string fightingName, string firearmsName)
    {
        var specializations = new Dictionary<string, IReadOnlyDictionary<string, int>>
        {
            [fightingName] = new Dictionary<string, int> { ["Brawl"] = 25 },
            [firearmsName] = new Dictionary<string, int> { ["Handgun"] = 20, ["Rifle/Shotgun"] = 25 },
            ["Other"] = new Dictionary<string, int> { ["Ignored"] = 1 },
        };

        var rules = new CampaignPlayNonPlayerEntityRuleData(new StubRuleData(specializations)).CombatSkillSpecializations;

        Assert.Equal(["Brawl"], rules.Fighting);
        Assert.Equal(["Handgun", "Rifle/Shotgun"], rules.Firearms);
    }

    [Fact]
    public void Given_a_catalog_without_the_combat_families_When_reading_the_specializations_Then_both_lists_are_empty()
    {
        var specializations = new Dictionary<string, IReadOnlyDictionary<string, int>>
        {
            ["Other"] = new Dictionary<string, int> { ["Ignored"] = 1 },
        };

        var rules = new CampaignPlayNonPlayerEntityRuleData(new StubRuleData(specializations)).CombatSkillSpecializations;

        Assert.Empty(rules.Fighting);
        Assert.Empty(rules.Firearms);
    }

    // Only the specializations vary; the other catalogs are the real ones.
    private sealed class StubRuleData : ICreationRuleData
    {
        private static readonly EmbeddedResourceCreationRuleData Real = new();

        public StubRuleData(IReadOnlyDictionary<string, IReadOnlyDictionary<string, int>> closedFamilies) =>
            SkillSpecializations = new SkillSpecializationCatalog(closedFamilies, []);

        public AgeRules AgeRules => Real.AgeRules;

        public CharacteristicsRules CharacteristicsRules => Real.CharacteristicsRules;

        public SkillSpecializationCatalog SkillSpecializations { get; }
    }
}
