namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Reads the skill catalog (section 6.1 data) and the skill specialization catalog (section 6.2 data) with the
/// section 20 provenance envelope (docs/game-rules/coc7_character_creation_and_development_rules.md section 20).
/// </summary>
public static class SkillCatalogReader
{
    private const string SkillCatalogName = "SkillCatalog";
    private const int SkillCatalogSchemaVersion = 2;
    private const string SpecializationCatalogName = "SkillSpecializationCatalog";
    private const int SpecializationCatalogSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static SkillCatalog ReadSkills(Stream stream, Era expectedEra)
    {
        var file = JsonSerializer.Deserialize<SkillCatalogFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException("The skill catalog is empty.");

        if (file.Catalog != SkillCatalogName || file.SchemaVersion != SkillCatalogSchemaVersion || file.Era != expectedEra.Code)
        {
            throw new InvalidOperationException(
                $"Expected a {SkillCatalogName} v{SkillCatalogSchemaVersion} for the {expectedEra} Era, "
                + $"found {file.Catalog} v{file.SchemaVersion} for '{file.Era}'.");
        }

        return new SkillCatalog(expectedEra, file.Entries.Select(entry => ToDefinition(entry.Data)).ToList());
    }

    public static SkillSpecializationCatalog ReadSpecializations(Stream stream)
    {
        var file = JsonSerializer.Deserialize<SpecializationCatalogFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException("The skill specialization catalog is empty.");

        if (file.Catalog != SpecializationCatalogName || file.SchemaVersion != SpecializationCatalogSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Expected a {SpecializationCatalogName} v{SpecializationCatalogSchemaVersion} catalog, found {file.Catalog} v{file.SchemaVersion}.");
        }

        var closed = file.ClosedFamilies.ToDictionary(
            family => family,
            family => (IReadOnlyDictionary<string, int>)file.Entries
                .Where(entry => entry.Data.Skill == family)
                .ToDictionary(
                    entry => entry.Data.Specialization,
                    entry => entry.Data.Base.Value ?? throw new InvalidOperationException($"The specialization '{entry.Id}' has no base value."),
                    StringComparer.OrdinalIgnoreCase),
            StringComparer.OrdinalIgnoreCase);
        return new SkillSpecializationCatalog(closed, file.OpenFamilies);
    }

    private static SkillDefinition ToDefinition(SkillData data) =>
        new(new SkillReference(data.Skill ?? data.Name, data.Specialization), ToBase(data));

    private static SkillBase ToBase(SkillData data) =>
        data.Base.Kind switch
        {
            "fixed" => SkillBase.Fixed(data.Base.Value ?? throw Missing(data, "value")),
            "characteristic" => SkillBase.FromCharacteristic(ParseCharacteristic(data), data.Base.Divisor ?? 1),
            _ => throw new InvalidOperationException($"The skill '{data.Name}' has an unknown base kind '{data.Base.Kind}'."),
        };

    private static Characteristic ParseCharacteristic(SkillData data) =>
        CharacteristicCodes.TryParse(data.Base.Characteristic, out var characteristic)
            ? characteristic
            : throw Missing(data, "characteristic");

    private static InvalidOperationException Missing(SkillData data, string field) => new($"The skill '{data.Name}' has no base {field}.");

    private sealed record SkillCatalogFile(string Catalog, string Era, int SchemaVersion, IReadOnlyList<CatalogEntry<SkillData>> Entries);

    private sealed record SpecializationCatalogFile(
        string Catalog,
        int SchemaVersion,
        IReadOnlyList<string> ClosedFamilies,
        IReadOnlyList<string> OpenFamilies,
        IReadOnlyList<CatalogEntry<SpecializationData>> Entries);

    private sealed record CatalogEntry<TData>(string Id, TData Data);

    private sealed record SkillData(string Name, string? Skill, string? Specialization, BaseData Base);

    private sealed record SpecializationData(string Skill, string Specialization, BaseData Base);

    private sealed record BaseData(string Kind, int? Value, string? Characteristic, int? Divisor);
}
