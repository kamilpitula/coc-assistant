namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The Occupation catalog for a Campaign's Era, shaped like docs/game-rules/catalogs/occupations.&lt;era&gt;.json.</summary>
public record OccupationCatalogResponse(
    string Era,
    IReadOnlyDictionary<string, IReadOnlyList<OccupationSkillSlotResponse>> SkillGroups,
    IReadOnlyList<OccupationResponse> Occupations)
{
    public static OccupationCatalogResponse From(OccupationCatalog catalog) =>
        new(
            catalog.Era.Code,
            catalog.SkillGroups.ToDictionary(group => group.Key, group => OccupationSkillSlotResponse.FromAll(group.Value)),
            catalog.Occupations.Select(OccupationResponse.From).ToList());
}

public record OccupationResponse(
    string Id,
    string Name,
    int CreditRatingMin,
    int CreditRatingMax,
    OccupationPointFormulaResponse OccupationPointFormula,
    IReadOnlyList<OccupationSkillSlotResponse> SkillSlots)
{
    public static OccupationResponse From(Occupation occupation) =>
        new(
            occupation.Id,
            occupation.Name,
            occupation.CreditRatingMin,
            occupation.CreditRatingMax,
            new OccupationPointFormulaResponse(occupation.OccupationPointFormula.Terms
                .Select(term => new OccupationPointTermResponse(term.Characteristics, term.Multiplier))
                .ToList()),
            OccupationSkillSlotResponse.FromAll(occupation.SkillSlots));
}

public record OccupationPointFormulaResponse(IReadOnlyList<OccupationPointTermResponse> Terms);

public record OccupationPointTermResponse(IReadOnlyList<string> Characteristics, int Multiplier);

/// <summary>An occupation skill slot; Kind uses the catalog's names: skill, group, any, or choice.</summary>
public record OccupationSkillSlotResponse(
    string Kind,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Skill,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Specialization,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Choose,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Group,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<OccupationSkillSlotResponse>? From)
{
    public static IReadOnlyList<OccupationSkillSlotResponse> FromAll(IEnumerable<OccupationSkillSlot> slots) =>
        slots.Select(FromSlot).ToList();

    private static OccupationSkillSlotResponse FromSlot(OccupationSkillSlot slot) =>
        new(
            JsonNamingPolicy.CamelCase.ConvertName(slot.Kind.ToString()),
            slot.Skill,
            slot.Specialization,
            slot.Choose,
            slot.Group,
            slot.From is null ? null : FromAll(slot.From));
}
