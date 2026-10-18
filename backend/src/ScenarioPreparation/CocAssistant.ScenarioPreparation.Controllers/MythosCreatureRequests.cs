namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates a Mythos Creature from its name alone; the Creature Kind and the rest are set by editing. A missing name is a
/// 400 keyed <c>name</c> (ADR 0018).
/// </summary>
public sealed record MythosCreatureCreateRequest(string? Name);

public sealed record MonsterDetailsRequest(
    string? CreatureKind,
    string? DescriptionAndSensoryCues,
    string? Origin,
    string? GoalAndBehavior,
    string? SignsAndTraces,
    string? DefeatOutcome,
    string? SpecimenRangeNotes);

public sealed record NumberOverrideRequest(int? Value, string? Reason);

public sealed record DamageBonusOverrideRequest(string? Value, string? Reason);

public sealed record MonsterOverridesRequest(
    NumberOverrideRequest? HitPoints,
    NumberOverrideRequest? MagicPoints,
    DamageBonusOverrideRequest? DamageBonus,
    NumberOverrideRequest? Build);

public sealed record MonsterCharacteristicsRequest(Dictionary<string, int?>? Values, bool HitPointsNotApplicable, MonsterOverridesRequest? Overrides);

public sealed record MonsterMovementModeRequest(string? Mode, string? Label, int? Rate);

public sealed record MonsterAttackRequest(string? Name, string? Skill, int? SkillValue, string? Damage, string? Effect, bool Manoeuvre);

public sealed record MonsterCombatRequest(int? AttacksPerRound, int? Dodge, IReadOnlyList<MonsterAttackRequest>? Attacks);

public sealed record MonsterDefenseEntryRequest(string? Description);

public sealed record MonsterDefensesRequest(
    int? ArmorPoints,
    string? ArmorNote,
    IReadOnlyList<MonsterDefenseEntryRequest>? Immunities,
    IReadOnlyList<MonsterDefenseEntryRequest>? Vulnerabilities);

public sealed record MonsterSkillRequest(string? Name, int? Value);

public sealed record MonsterSpellRequest(string? Name, string? MagicPointCost, string? Effect);

public sealed record MonsterPowerRequest(string? Name, string? MagicPointCost, string? Effect, string? Limits);

public sealed record MonsterSanityLossRequest(string? Value);

/// <summary>
/// Replaces a Mythos Creature's whole Monster Profile. A section that is absent or <c>null</c> is not added; an empty one
/// is kept. <c>KeeperNotes</c> is the Lexical document as a nested JSON value (ADR 0015). The request never carries
/// derived values or difficulty.
/// </summary>
public sealed record MythosCreatureRequest(
    string? Name,
    MonsterDetailsRequest? Details,
    JsonElement? KeeperNotes,
    MonsterCharacteristicsRequest? Characteristics,
    IReadOnlyList<MonsterMovementModeRequest>? Movement,
    MonsterCombatRequest? Combat,
    MonsterDefensesRequest? Defenses,
    IReadOnlyList<MonsterSkillRequest>? Skills,
    IReadOnlyList<MonsterSpellRequest>? Spells,
    IReadOnlyList<MonsterPowerRequest>? Powers,
    MonsterSanityLossRequest? SanityLoss);
