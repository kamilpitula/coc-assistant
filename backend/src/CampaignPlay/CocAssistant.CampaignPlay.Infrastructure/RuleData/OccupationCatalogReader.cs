namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Reads an Occupation catalog file with the section 20 provenance envelope
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 20).
/// </summary>
public static class OccupationCatalogReader
{
    private const string CatalogName = "OccupationCatalog";
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false) },
        RespectNullableAnnotations = true,
        RespectRequiredConstructorParameters = true,
    };

    /// <summary>Parses the catalog and checks that it is an Occupation catalog of the supported schema for the expected Era.</summary>
    public static OccupationCatalog Read(Stream stream, Era expectedEra)
    {
        var file = JsonSerializer.Deserialize<OccupationCatalogFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException("The Occupation catalog is empty.");

        if (file.Catalog != CatalogName || file.SchemaVersion != SupportedSchemaVersion || file.Era != expectedEra.Code)
        {
            throw new InvalidOperationException(
                $"Expected an {CatalogName} v{SupportedSchemaVersion} for the {expectedEra} Era, "
                + $"found {file.Catalog} v{file.SchemaVersion} for '{file.Era}'.");
        }

        return new OccupationCatalog(expectedEra, file.SkillGroups, file.Entries.Select(ToOccupation).ToList());
    }

    private static Occupation ToOccupation(OccupationCatalogEntry entry) =>
        new(
            entry.Id,
            entry.Data.Name,
            entry.Data.CreditRatingMin,
            entry.Data.CreditRatingMax,
            entry.Data.OccupationPointFormula,
            entry.Data.SkillSlots);

    private sealed record OccupationCatalogFile(
        string Catalog,
        string Era,
        int SchemaVersion,
        Dictionary<string, IReadOnlyList<OccupationSkillSlot>> SkillGroups,
        IReadOnlyList<OccupationCatalogEntry> Entries);

    private sealed record OccupationCatalogEntry(string Id, OccupationData Data);

    private sealed record OccupationData(
        string Name,
        int CreditRatingMin,
        int CreditRatingMax,
        OccupationPointFormula OccupationPointFormula,
        IReadOnlyList<OccupationSkillSlot> SkillSlots);
}
