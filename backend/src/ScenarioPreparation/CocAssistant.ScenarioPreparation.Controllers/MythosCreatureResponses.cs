namespace CocAssistant.ScenarioPreparation.Controllers;

// Sections that are the same on the way in and out reuse the request records: details, overrides, movement, defenses
// entries, spells, powers, and sanity loss.

/// <summary>The worked-out values; each is null when the characteristics it needs are not entered. No MOV.</summary>
public sealed record MonsterDerivedValuesResponse(int? HitPoints, int? MagicPoints, string? DamageBonus, int? Build);

/// <summary>
/// The characteristics by code (null when not entered), Hit Points not applicable, the overrides as recorded, the
/// Investigator Difficulty of each entered characteristic, and the computed values. Overrides never replace the computed
/// values. Difficulty is Regular, Hard, or Extreme.
/// </summary>
public sealed record MonsterCharacteristicsResponse(
    IReadOnlyDictionary<string, int?> Values,
    bool HitPointsNotApplicable,
    MonsterOverridesRequest Overrides,
    IReadOnlyDictionary<string, string> Difficulty,
    MonsterDerivedValuesResponse Derived);

public sealed record MonsterAttackResponse(string? Name, string? Skill, int? SkillValue, string Difficulty, string? Damage, string? Effect, bool Manoeuvre);

public sealed record MonsterCombatResponse(int? AttacksPerRound, int? Dodge, string? DodgeDifficulty, IReadOnlyList<MonsterAttackResponse> Attacks);

public sealed record MonsterSkillResponse(string? Name, int? Value, string Difficulty);

/// <summary>A Mythos Creature with its Monster Profile. Sections are null when not added. <c>KeeperNotes</c> is the stored document or null.</summary>
public sealed record MythosCreatureResponse(
    Guid Id,
    string Name,
    MonsterDetailsRequest Details,
    JsonElement? KeeperNotes,
    MonsterCharacteristicsResponse? Characteristics,
    IReadOnlyList<MonsterMovementModeRequest>? Movement,
    MonsterCombatResponse? Combat,
    MonsterDefensesRequest? Defenses,
    IReadOnlyList<MonsterSkillResponse>? Skills,
    IReadOnlyList<MonsterSpellRequest>? Spells,
    IReadOnlyList<MonsterPowerRequest>? Powers,
    MonsterSanityLossRequest? SanityLoss);
