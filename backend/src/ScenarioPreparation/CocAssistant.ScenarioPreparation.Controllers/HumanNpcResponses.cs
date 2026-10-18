namespace CocAssistant.ScenarioPreparation.Controllers;

public sealed record NpcDetailsResponse(
    string? ProfessionOrRole,
    string? ShortDescription,
    string? Goal,
    string? RelationshipToInvestigators,
    string? Knowledge,
    string? Secrets,
    string? BehaviorCue);

/// <summary>The worked-out values; each is null when the characteristics it needs are not entered.</summary>
public sealed record NpcDerivedValuesResponse(
    int? HitPoints,
    int? MagicPoints,
    string? DamageBonus,
    int? Build,
    int? MovementRate,
    bool MovementRateNotCovered);

/// <summary>
/// The characteristics by code (null when not entered), the Investigator Difficulty of each entered one, and the
/// derived values. Difficulty is Regular, Hard, or Extreme.
/// </summary>
public sealed record NpcCharacteristicsResponse(
    IReadOnlyDictionary<string, int?> Values,
    IReadOnlyDictionary<string, string> Difficulty,
    NpcDerivedValuesResponse Derived);

public sealed record NpcSkillResponse(string? Name, string? Specialization, int? Value, string Difficulty);

public sealed record NpcWeaponResponse(
    string? Name,
    NpcSkillReferenceRequest? Skill,
    string? Damage,
    int? AttacksPerRound,
    string? Range,
    string? Ammunition,
    string? Malfunction,
    bool Impaling);

public sealed record NpcCombatResponse(
    int? Dodge,
    string? DodgeDifficulty,
    int? ArmorPoints,
    string? TacticsAndMorale,
    IReadOnlyList<NpcWeaponResponse> Weapons);

public sealed record NpcSpellResponse(string? Name, string? MagicPointCost, string? Effect);

/// <summary>A Human NPC with its NPC Profile. Sections are null when not added. <c>KeeperNotes</c> is the stored document or null.</summary>
public sealed record HumanNpcResponse(
    Guid Id,
    string Name,
    int? Age,
    NpcDetailsResponse Details,
    JsonElement? KeeperNotes,
    NpcCharacteristicsResponse? Characteristics,
    IReadOnlyList<NpcSkillResponse>? Skills,
    NpcCombatResponse? Combat,
    IReadOnlyList<NpcSpellResponse>? Spells);

/// <summary>One row of the Non-Player Entity list; <c>Type</c> is HumanNpc or MythosCreature.</summary>
public sealed record NonPlayerEntitySummaryResponse(Guid Id, string Type, string Name);

public sealed record NonPlayerEntityListResponse(IReadOnlyList<NonPlayerEntitySummaryResponse> Items);
