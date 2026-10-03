namespace CocAssistant.CampaignPlay.Infrastructure;

/// <summary>
/// Stored JSON form of the Character Sheet with an explicit schema version (ADR 0005, ADR 0007). Only the Player's
/// inputs are stored; a future schema version adds an upgrade step in <see cref="FromStorage"/>.
/// </summary>
public static class CharacterSheetJsonStorage
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };

    public static string ToStorage(CharacterSheet sheet) =>
        JsonSerializer.Serialize(CharacterSheetDocument.From(sheet), SerializerOptions);

    public static CharacterSheet FromStorage(string stored)
    {
        var document = JsonSerializer.Deserialize<CharacterSheetDocument>(stored, SerializerOptions)
            ?? throw new InvalidOperationException("The stored Character Sheet is empty.");

        if (document.SchemaVersion != CharacterSheet.CurrentSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported Character Sheet schema version {document.SchemaVersion}; expected {CharacterSheet.CurrentSchemaVersion}.");
        }

        return document.ToCharacterSheet();
    }

    private sealed record CharacterSheetDocument(
        int SchemaVersion,
        IdentityDocument Identity,
        CreationMethod? CreationMethod,
        Dictionary<string, int> AssignedCharacteristics,
        Dictionary<string, int>? AgeDeductions,
        IReadOnlyList<RollRecordDocument>? RollRecords)
    {
        public static CharacterSheetDocument From(CharacterSheet sheet) =>
            new(
                CharacterSheet.CurrentSchemaVersion,
                IdentityDocument.From(sheet.Identity),
                sheet.CreationMethod,
                ToCodes(sheet.AssignedCharacteristics),
                ToCodes(sheet.AgeDeductions),
                sheet.RollRecords.Select(RollRecordDocument.From).ToList());

        public CharacterSheet ToCharacterSheet() =>
            new(
                Identity.ToIdentity(),
                CreationMethod,
                FromCodes(AssignedCharacteristics),
                FromCodes(AgeDeductions),
                (RollRecords ?? []).Select(record => record.ToRollRecord()).ToList());
    }

    private sealed record RollRecordDocument(string Purpose, string Dice, int Result, RollSource Source)
    {
        public static RollRecordDocument From(RollRecord record) => new(record.Purpose, record.Dice, record.Result, record.Source);

        public RollRecord ToRollRecord() => new(Purpose, Dice, Result, Source);
    }

    private sealed record IdentityDocument(string? Name, int? Age, string? Gender, string? Residence, string? Birthplace)
    {
        public static IdentityDocument From(InvestigatorIdentity identity) =>
            new(identity.Name, identity.Age, identity.Gender, identity.Residence, identity.Birthplace);

        public InvestigatorIdentity ToIdentity() => new(Name, Age, Gender, Residence, Birthplace);
    }

    private static Dictionary<string, int> ToCodes(CharacteristicValues values) =>
        values.Present.ToDictionary(characteristic => characteristic.ToCode(), characteristic => values[characteristic]!.Value);

    private static CharacteristicValues FromCodes(Dictionary<string, int>? values) =>
        CharacteristicValues.From((values ?? []).Select(entry =>
            CharacteristicCodes.TryParse(entry.Key, out var characteristic)
                ? KeyValuePair.Create(characteristic, (int?)entry.Value)
                : throw new InvalidOperationException($"Unknown stored characteristic '{entry.Key}'.")));
}
