namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Stored JSON form of a Human NPC's NPC Profile with an explicit schema version (ADR 0005, ADR 0007). The Keeper notes
/// are a nested JSON element, not an escaped string. Only what the Keeper entered is stored: never derived values or
/// difficulty. A future schema version adds an upgrade step in <see cref="FromStorage"/>.
/// </summary>
public static class HumanNpcProfileJsonStorage
{
    public const int CurrentSchemaVersion = 1;

    private const int FirstSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public static string ToStorage(NpcProfile profile) =>
        JsonSerializer.Serialize(ProfileDocument.From(profile), SerializerOptions);

    public static NpcProfile FromStorage(string stored)
    {
        var document = JsonSerializer.Deserialize<ProfileDocument>(stored, SerializerOptions)
            ?? throw new InvalidOperationException("The stored NPC Profile is empty.");

        if (document.SchemaVersion is < FirstSchemaVersion or > CurrentSchemaVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported NPC Profile schema version {document.SchemaVersion}; expected {CurrentSchemaVersion}.");
        }

        return document.ToProfile();
    }

    private sealed record ProfileDocument(
        int SchemaVersion,
        int? Age,
        DetailsDocument? Details,
        JsonElement? KeeperNotes,
        Dictionary<string, int?>? Characteristics,
        IReadOnlyList<SkillDocument>? Skills,
        CombatDocument? Combat,
        IReadOnlyList<SpellDocument>? Spells)
    {
        public static ProfileDocument From(NpcProfile profile) =>
            new(
                CurrentSchemaVersion,
                profile.Age,
                DetailsDocument.From(profile.Details),
                profile.KeeperNotes is null ? null : ParseNotes(profile.KeeperNotes),
                profile.Characteristics?.Values.ToDictionary(),
                profile.Skills?.Select(SkillDocument.From).ToList(),
                profile.Combat is null ? null : CombatDocument.From(profile.Combat),
                profile.Spells?.Select(SpellDocument.From).ToList());

        public NpcProfile ToProfile() =>
            new(
                Age,
                (Details ?? DetailsDocument.Empty).ToDetails(),
                KeeperNotes is { ValueKind: not JsonValueKind.Null } notes ? notes.GetRawText() : null,
                Characteristics is null ? null : new NpcCharacteristics(Characteristics),
                Skills?.Select(skill => skill.ToSkill()).ToList(),
                Combat?.ToCombat(),
                Spells?.Select(spell => spell.ToSpell()).ToList());

        private static JsonElement ParseNotes(string keeperNotes)
        {
            using var document = JsonDocument.Parse(keeperNotes);
            return document.RootElement.Clone();
        }
    }

    private sealed record DetailsDocument(
        string? ProfessionOrRole,
        string? ShortDescription,
        string? Goal,
        string? RelationshipToInvestigators,
        string? Knowledge,
        string? Secrets,
        string? BehaviorCue)
    {
        public static readonly DetailsDocument Empty = new(null, null, null, null, null, null, null);

        public static DetailsDocument From(NpcDetails details) =>
            new(
                details.ProfessionOrRole,
                details.ShortDescription,
                details.Goal,
                details.RelationshipToInvestigators,
                details.Knowledge,
                details.Secrets,
                details.BehaviorCue);

        public NpcDetails ToDetails() =>
            new(ProfessionOrRole, ShortDescription, Goal, RelationshipToInvestigators, Knowledge, Secrets, BehaviorCue);
    }

    private sealed record SkillDocument(string? Name, string? Specialization, int? Value)
    {
        public static SkillDocument From(NpcSkill skill) => new(skill.Name, skill.Specialization, skill.Value);

        public NpcSkill ToSkill() => new(Name, Specialization, Value);
    }

    private sealed record WeaponSkillDocument(string? Name, string? Specialization);

    private sealed record WeaponDocument(
        string? Name,
        WeaponSkillDocument? Skill,
        string? Damage,
        int? AttacksPerRound,
        string? Range,
        string? Ammunition,
        string? Malfunction,
        bool Impaling)
    {
        public static WeaponDocument From(NpcWeapon weapon) =>
            new(
                weapon.Name,
                weapon.Skill is null ? null : new WeaponSkillDocument(weapon.Skill.Name, weapon.Skill.Specialization),
                weapon.Damage,
                weapon.AttacksPerRound,
                weapon.Range,
                weapon.Ammunition,
                weapon.Malfunction,
                weapon.Impaling);

        public NpcWeapon ToWeapon() =>
            new(
                Name,
                Skill is null ? null : new NpcSkillReference(Skill.Name, Skill.Specialization),
                Damage,
                AttacksPerRound,
                Range,
                Ammunition,
                Malfunction,
                Impaling);
    }

    private sealed record CombatDocument(int? Dodge, int? ArmorPoints, string? TacticsAndMorale, IReadOnlyList<WeaponDocument>? Weapons)
    {
        public static CombatDocument From(NpcCombat combat) =>
            new(combat.Dodge, combat.ArmorPoints, combat.TacticsAndMorale, combat.Weapons.Select(WeaponDocument.From).ToList());

        public NpcCombat ToCombat() =>
            new(Dodge, ArmorPoints, TacticsAndMorale, (Weapons ?? []).Select(weapon => weapon.ToWeapon()).ToList());
    }

    private sealed record SpellDocument(string? Name, string? MagicPointCost, string? Effect)
    {
        public static SpellDocument From(NpcSpell spell) => new(spell.Name, spell.MagicPointCost, spell.Effect);

        public NpcSpell ToSpell() => new(Name, MagicPointCost, Effect);
    }
}
