namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Stored JSON form of a Requested Roll's Roll Records, with an explicit schema version. Version 1 stores every record
/// with its percentile roll and experience-check flag, following the CharacterSheetJsonStorage document mapping.
/// </summary>
public static class RollRequestJsonStorage
{
    public const int CurrentSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };

    public static string ToStorage(IReadOnlyList<RollRecord> records) =>
        JsonSerializer.Serialize(
            new RollRecordsDocument(CurrentSchemaVersion, records.Select(RollRecordDocument.From).ToList()),
            SerializerOptions);

    public static IReadOnlyList<RollRecord> FromStorage(string stored)
    {
        var document = JsonSerializer.Deserialize<RollRecordsDocument>(stored, SerializerOptions)
            ?? throw new InvalidOperationException("The stored Roll Records are empty.");

        if (document.SchemaVersion != CurrentSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported Roll Records schema version {document.SchemaVersion}; expected {CurrentSchemaVersion}.");
        }

        return document.RollRecords.Select(record => record.ToRollRecord()).ToList();
    }

    private sealed record RollRecordsDocument(int SchemaVersion, IReadOnlyList<RollRecordDocument> RollRecords);

    private sealed record RollRecordDocument(
        string Purpose,
        string Dice,
        int Result,
        RollSource Source,
        IReadOnlyList<int>? Faces,
        Guid? RolledByAccountId,
        DateTimeOffset? RolledAt,
        PercentileRollDocument? Percentile,
        bool? EarnsExperienceCheck)
    {
        public static RollRecordDocument From(RollRecord record) =>
            new(
                record.Purpose,
                record.Dice,
                record.Result,
                record.Source,
                record.Faces,
                record.RolledByAccountId,
                record.RolledAt,
                record.Percentile is null ? null : PercentileRollDocument.From(record.Percentile),
                record.EarnsExperienceCheck);

        public RollRecord ToRollRecord() =>
            new(Purpose, Dice, Result, Source, Faces, RolledByAccountId, RolledAt, Percentile?.ToPercentileRoll(), EarnsExperienceCheck);
    }

    private sealed record PercentileRollDocument(
        int TargetValue,
        int RegularTarget,
        int HardTarget,
        int ExtremeTarget,
        Difficulty Difficulty,
        int BonusDice,
        int PenaltyDice,
        int UnitsFace,
        IReadOnlyList<int> TensFaces,
        int KeptTens,
        int Result,
        SuccessLevel SuccessLevel,
        bool IsSuccess)
    {
        public static PercentileRollDocument From(PercentileRoll percentile) =>
            new(
                percentile.TargetValue,
                percentile.RegularTarget,
                percentile.HardTarget,
                percentile.ExtremeTarget,
                percentile.Difficulty,
                percentile.BonusDice,
                percentile.PenaltyDice,
                percentile.UnitsFace,
                percentile.TensFaces,
                percentile.KeptTens,
                percentile.Result,
                percentile.SuccessLevel,
                percentile.IsSuccess);

        public PercentileRoll ToPercentileRoll() =>
            new(
                TargetValue,
                RegularTarget,
                HardTarget,
                ExtremeTarget,
                Difficulty,
                BonusDice,
                PenaltyDice,
                UnitsFace,
                TensFaces,
                KeptTens,
                Result,
                SuccessLevel,
                IsSuccess);
    }
}
