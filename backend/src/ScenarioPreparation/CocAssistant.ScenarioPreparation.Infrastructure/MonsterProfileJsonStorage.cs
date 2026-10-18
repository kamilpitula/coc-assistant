namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Stored JSON form of a Mythos Creature's Monster Profile with an explicit schema version (ADR 0005, ADR 0007). The
/// Keeper notes are a nested JSON element, not an escaped string. Only what the Keeper entered is stored: never derived
/// values or difficulty; overrides are stored with their reasons. The section records are serialized as they are, so a
/// change to one needs a new schema version with an upgrade step in <see cref="FromStorage"/>.
/// </summary>
public static class MonsterProfileJsonStorage
{
    public const int CurrentSchemaVersion = 1;

    private const int FirstSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static string ToStorage(MonsterProfile profile) =>
        JsonSerializer.Serialize(ProfileDocument.From(profile), SerializerOptions);

    public static MonsterProfile FromStorage(string stored)
    {
        var document = JsonSerializer.Deserialize<ProfileDocument>(stored, SerializerOptions)
            ?? throw new InvalidOperationException("The stored Monster Profile is empty.");

        if (document.SchemaVersion is < FirstSchemaVersion or > CurrentSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported Monster Profile schema version {document.SchemaVersion}; expected {CurrentSchemaVersion}.");
        }

        return document.ToProfile();
    }

    private sealed record ProfileDocument(
        int SchemaVersion,
        MonsterDetails? Details,
        JsonElement? KeeperNotes,
        MonsterCharacteristics? Characteristics,
        IReadOnlyList<MonsterMovementMode>? Movement,
        MonsterCombat? Combat,
        MonsterDefenses? Defenses,
        IReadOnlyList<MonsterSkill>? Skills,
        IReadOnlyList<MonsterSpell>? Spells,
        IReadOnlyList<MonsterPower>? Powers,
        MonsterSanityLoss? SanityLoss)
    {
        public static ProfileDocument From(MonsterProfile profile) =>
            new(
                CurrentSchemaVersion,
                profile.Details,
                profile.KeeperNotes is null ? null : ParseNotes(profile.KeeperNotes),
                profile.Characteristics,
                profile.Movement,
                profile.Combat,
                profile.Defenses,
                profile.Skills,
                profile.Spells,
                profile.Powers,
                profile.SanityLoss);

        public MonsterProfile ToProfile() =>
            new(
                Details ?? MonsterDetails.Empty,
                KeeperNotes is { ValueKind: not JsonValueKind.Null } notes ? notes.GetRawText() : null,
                Characteristics,
                Movement,
                Combat,
                Defenses,
                Skills,
                Spells,
                Powers,
                SanityLoss);

        private static JsonElement ParseNotes(string keeperNotes)
        {
            using var document = JsonDocument.Parse(keeperNotes);
            return document.RootElement.Clone();
        }
    }
}
