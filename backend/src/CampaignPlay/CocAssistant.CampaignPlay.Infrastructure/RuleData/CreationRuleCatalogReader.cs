namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Reads the creation rule catalogs with the section 20 provenance envelope
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 20).
/// </summary>
public static class CreationRuleCatalogReader
{
    private const string AgeRulesCatalogName = "AgeRules";
    private const string CharacteristicsRulesCatalogName = "CharacteristicsRules";
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static AgeRules ReadAgeRules(Stream stream)
    {
        var file = Read<AgeRulesFile>(stream, AgeRulesCatalogName, file => (file.Catalog, file.SchemaVersion));
        var brackets = file.Entries
            .Where(entry => !entry.Data.KeeperAdjudication)
            .Select(entry => ToBracket(entry.Data))
            .ToList();
        return new AgeRules(brackets);
    }

    public static CharacteristicsRules ReadCharacteristicsRules(Stream stream)
    {
        var file = Read<CharacteristicsRulesFile>(stream, CharacteristicsRulesCatalogName, file => (file.Catalog, file.SchemaVersion));
        return new CharacteristicsRules(file.DamageBonusAndBuild
            .Select(entry => new DamageBonusAndBuildBand(
                entry.Data.MinimumStrengthSize,
                entry.Data.MaximumStrengthSize,
                entry.Data.DamageBonus,
                entry.Data.Build))
            .ToList());
    }

    private static TFile Read<TFile>(Stream stream, string catalogName, Func<TFile, (string Catalog, int SchemaVersion)> header)
    {
        var file = JsonSerializer.Deserialize<TFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException($"The {catalogName} catalog is empty.");

        var (catalog, schemaVersion) = header(file);
        if (catalog != catalogName || schemaVersion != SupportedSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Expected a {catalogName} v{SupportedSchemaVersion} catalog, found {catalog} v{schemaVersion}.");
        }

        return file;
    }

    private static AgeBracket ToBracket(AgeBracketData data)
    {
        var deduction = data.PhysicalDeduction
            ?? throw new InvalidOperationException($"The age bracket {data.MinimumAge}-{data.MaximumAge} has no physical deduction.");

        return new AgeBracket(
            data.MinimumAge,
            data.MaximumAge,
            deduction.Total,
            deduction.Characteristics.Select(ParseCharacteristic).ToList(),
            data.AppearanceModifier ?? throw MissingValue(data, "appearanceModifier"),
            data.EduImprovementChecks ?? throw MissingValue(data, "eduImprovementChecks"),
            data.LuckRolls ?? throw MissingValue(data, "luckRolls"));
    }

    private static Characteristic ParseCharacteristic(string code) =>
        CharacteristicCodes.TryParse(code, out var characteristic)
            ? characteristic
            : throw new InvalidOperationException($"Unknown characteristic '{code}' in the age rules catalog.");

    private static InvalidOperationException MissingValue(AgeBracketData data, string field) =>
        new($"The age bracket {data.MinimumAge}-{data.MaximumAge} has no {field}.");

    private sealed record AgeRulesFile(string Catalog, int SchemaVersion, IReadOnlyList<CatalogEntry<AgeBracketData>> Entries);

    private sealed record CharacteristicsRulesFile(
        string Catalog,
        int SchemaVersion,
        IReadOnlyList<CatalogEntry<DamageBonusAndBuildData>> DamageBonusAndBuild);

    private sealed record CatalogEntry<TData>(string Id, TData Data);

    private sealed record AgeBracketData(
        int MinimumAge,
        int MaximumAge,
        bool KeeperAdjudication,
        PhysicalDeductionData? PhysicalDeduction,
        int? AppearanceModifier,
        int? EduImprovementChecks,
        int? LuckRolls);

    private sealed record PhysicalDeductionData(int Total, IReadOnlyList<string> Characteristics);

    private sealed record DamageBonusAndBuildData(int MinimumStrengthSize, int MaximumStrengthSize, string DamageBonus, int Build);
}
