namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The narrative core of an NPC Profile: plain-text fields, each up to 4,000 characters. Blank values are stored as null.
/// </summary>
public sealed record NpcDetails(
    string? ProfessionOrRole,
    string? ShortDescription,
    string? Goal,
    string? RelationshipToInvestigators,
    string? Knowledge,
    string? Secrets,
    string? BehaviorCue)
{
    public static readonly NpcDetails Empty = new(null, null, null, null, null, null, null);
}

/// <summary>Characteristic values keyed by code (STR to EDU); a null value is a characteristic the Keeper did not enter.</summary>
public sealed record NpcCharacteristics(IReadOnlyDictionary<string, int?> Values);

/// <summary>A skill row. Name and Value are required once accepted; they are nullable so a request can omit them.</summary>
public sealed record NpcSkill(string? Name, string? Specialization, int? Value);

/// <summary>A weapon's skill, matched to the profile's skill rows by name and specialization, ignoring case.</summary>
public sealed record NpcSkillReference(string? Name, string? Specialization);

/// <summary>NPC Profile weapon fields of docs/game-rules/coc7_character_creation_and_development_rules.md section 10.1.</summary>
public sealed record NpcWeapon(
    string? Name,
    NpcSkillReference? Skill,
    string? Damage,
    int? AttacksPerRound,
    string? Range,
    string? Ammunition,
    string? Malfunction,
    bool Impaling);

public sealed record NpcCombat(int? Dodge, int? ArmorPoints, string? TacticsAndMorale, IReadOnlyList<NpcWeapon> Weapons);

/// <summary>A spell recorded as free text (docs/game-rules/project_ruleset.md section 5.6).</summary>
public sealed record NpcSpell(string? Name, string? MagicPointCost, string? Effect);

/// <summary>
/// A Human NPC's NPC Profile beyond its name (CONTEXT.md, NPC Profile). A null section was not added; an added empty
/// section is kept. Age is required once accepted. It never holds derived values or difficulty.
/// </summary>
public sealed record NpcProfile(
    int? Age,
    NpcDetails Details,
    string? KeeperNotes,
    NpcCharacteristics? Characteristics,
    IReadOnlyList<NpcSkill>? Skills,
    NpcCombat? Combat,
    IReadOnlyList<NpcSpell>? Spells)
{
    /// <summary>A profile with only the narrative core: no sections and no Keeper notes.</summary>
    public static NpcProfile Narrative(int? age) => new(age, NpcDetails.Empty, null, null, null, null, null);
}
