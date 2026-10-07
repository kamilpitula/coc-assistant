namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// The skills of a Campaign's Era (docs/game-rules/catalogs/skills.&lt;era&gt;.json), the specialized skills
/// (docs/game-rules/catalogs/skill-specializations.json), and the specialization suggestions.
/// </summary>
public record SkillCatalogResponse(
    string Era,
    IReadOnlyList<SkillDefinitionResponse> Skills,
    IReadOnlyList<ClosedFamilyResponse> ClosedFamilies,
    IReadOnlyList<string> OpenFamilies,
    IReadOnlyDictionary<string, IReadOnlyList<string>> SpecializationSuggestions)
{
    public static SkillCatalogResponse From(SkillRuleData data) =>
        new(
            data.Skills.Era.Code,
            data.Skills.Skills
                .Select(definition => new SkillDefinitionResponse(definition.Reference.Skill, definition.Reference.Specialization, SkillBaseResponse.From(definition.Base)))
                .ToList(),
            data.Specializations.ClosedFamilies
                .Select(family => new ClosedFamilyResponse(
                    family.Key,
                    family.Value.Select(entry => new ClosedSpecializationResponse(entry.Key, SkillBaseResponse.From(SkillBase.Fixed(entry.Value)))).ToList()))
                .ToList(),
            data.Specializations.OpenFamilies,
            data.SpecializationSuggestions);
}

public record SkillDefinitionResponse(string Skill, string? Specialization, SkillBaseResponse Base);

/// <summary>A skill base: kind "fixed" with a value, or kind "characteristic" with the characteristic and divisor.</summary>
public record SkillBaseResponse(
    string Kind,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Value,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Characteristic,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Divisor)
{
    public static SkillBaseResponse From(SkillBase skillBase) =>
        skillBase.Characteristic is { } characteristic
            ? new SkillBaseResponse("characteristic", null, characteristic.ToCode(), skillBase.Divisor)
            : new SkillBaseResponse("fixed", skillBase.FixedValue, null, null);
}

public record ClosedFamilyResponse(string Skill, IReadOnlyList<ClosedSpecializationResponse> Specializations);

public record ClosedSpecializationResponse(string Specialization, SkillBaseResponse Base);
