namespace CocAssistant.CampaignPlay.Tests;

/// <summary>The embedded 1920s rule data, shared by the tests that compute and validate Character Sheets.</summary>
public static class TestRules
{
    public static readonly ICreationRuleData Creation = new EmbeddedResourceCreationRuleData();
    public static readonly IEraRuleData Era1920s = EmbeddedResourceEraRuleData.For1920s();

    public static readonly CreationRuleSet The1920s = new(
        Creation.AgeRules,
        Creation.CharacteristicsRules,
        Creation.SkillSpecializations,
        Era1920s.Occupations,
        Era1920s.Skills,
        Era1920s.Wealth);

    public static readonly CharacterSheetCalculator Calculator = new(The1920s);

    public static IReadOnlyList<ValidationError> Validate(CharacterSheet sheet, AllowedCreationMethods allowed) =>
        CharacterSheetValidator.Validate(sheet, allowed, Calculator.Calculate(sheet), The1920s);
}
