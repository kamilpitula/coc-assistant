namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The narrative core of a Monster Profile: plain-text fields, each up to 4,000 characters. Blank values are stored as null.
/// <c>CreatureKind</c> arrives as text and is checked against <see cref="Domain.CreatureKind"/>.
/// </summary>
public sealed record MonsterDetails(
    string? CreatureKind,
    string? DescriptionAndSensoryCues,
    string? Origin,
    string? GoalAndBehavior,
    string? SignsAndTraces,
    string? DefeatOutcome,
    string? SpecimenRangeNotes)
{
    public static readonly MonsterDetails Empty = new(null, null, null, null, null, null, null);
}

/// <summary>A whole-number Derived Value Override with the reason it differs from the rules (project_ruleset.md section 5.4).</summary>
public sealed record NumberOverride(int? Value, string? Reason);

/// <summary>A Damage Bonus override written as notation, with its reason (project_ruleset.md sections 5.4 and 5.5).</summary>
public sealed record DamageBonusOverride(string? Value, string? Reason);

/// <summary>The Derived Value Overrides a Keeper recorded; a null override was not made.</summary>
public sealed record MonsterOverrides(
    NumberOverride? HitPoints,
    NumberOverride? MagicPoints,
    DamageBonusOverride? DamageBonus,
    NumberOverride? Build)
{
    public static readonly MonsterOverrides None = new(null, null, null, null);
}

/// <summary>
/// Characteristic values keyed by code; a null value is a characteristic the Keeper did not enter. Hit Points not
/// applicable and the overrides belong here because removing the section removes them.
/// </summary>
public sealed record MonsterCharacteristics(IReadOnlyDictionary<string, int?> Values, bool HitPointsNotApplicable, MonsterOverrides Overrides);

/// <summary>A movement mode; the label names an Other mode. Rate is required once accepted.</summary>
public sealed record MonsterMovementMode(string? Mode, string? Label, int? Rate);

/// <summary>An attack with its own skill and value (project_ruleset.md section 5.9). Damage may be absent for a manoeuvre.</summary>
public sealed record MonsterAttack(string? Name, string? Skill, int? SkillValue, string? Damage, string? Effect, bool Manoeuvre);

public sealed record MonsterCombat(int? AttacksPerRound, int? Dodge, IReadOnlyList<MonsterAttack> Attacks);

/// <summary>An immunity or a vulnerability, written as a description.</summary>
public sealed record MonsterDefenseEntry(string? Description);

public sealed record MonsterDefenses(
    int? ArmorPoints,
    string? ArmorNote,
    IReadOnlyList<MonsterDefenseEntry> Immunities,
    IReadOnlyList<MonsterDefenseEntry> Vulnerabilities);

public sealed record MonsterSkill(string? Name, int? Value);

/// <summary>A spell recorded as free text (project_ruleset.md section 5.6).</summary>
public sealed record MonsterSpell(string? Name, string? MagicPointCost, string? Effect);

/// <summary>A power: a spell-shaped entry with limits, kept apart from spells (project_ruleset.md section 5.6).</summary>
public sealed record MonsterPower(string? Name, string? MagicPointCost, string? Effect, string? Limits);

/// <summary>Sanity loss written "success/failure" (project_ruleset.md section 5.5); absent means no Sanity roll.</summary>
public sealed record MonsterSanityLoss(string? Value);

/// <summary>
/// A Mythos Creature's Monster Profile beyond its name (CONTEXT.md, Monster Profile). A null section was not added; an
/// added empty section is kept. It never holds derived values or difficulty.
/// </summary>
public sealed record MonsterProfile(
    MonsterDetails Details,
    string? KeeperNotes,
    MonsterCharacteristics? Characteristics,
    IReadOnlyList<MonsterMovementMode>? Movement,
    MonsterCombat? Combat,
    MonsterDefenses? Defenses,
    IReadOnlyList<MonsterSkill>? Skills,
    IReadOnlyList<MonsterSpell>? Spells,
    IReadOnlyList<MonsterPower>? Powers,
    MonsterSanityLoss? SanityLoss)
{
    /// <summary>A profile with only the narrative core: no sections and no Keeper notes.</summary>
    public static readonly MonsterProfile Empty = new(MonsterDetails.Empty, null, null, null, null, null, null, null, null, null);
}
