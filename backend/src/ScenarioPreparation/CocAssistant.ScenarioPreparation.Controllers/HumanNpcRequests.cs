namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates a Human NPC. The name and age are checked by the domain, so a missing one is a 400 keyed <c>name</c> or
/// <c>age</c> (ADR 0018).
/// </summary>
public sealed record HumanNpcCreateRequest(string? Name, int? Age);

public sealed record NpcDetailsRequest(
    string? ProfessionOrRole,
    string? ShortDescription,
    string? Goal,
    string? RelationshipToInvestigators,
    string? Knowledge,
    string? Secrets,
    string? BehaviorCue);

public sealed record NpcSkillRequest(string? Name, string? Specialization, int? Value);

public sealed record NpcSkillReferenceRequest(string? Name, string? Specialization);

public sealed record NpcWeaponRequest(
    string? Name,
    NpcSkillReferenceRequest? Skill,
    string? Damage,
    int? AttacksPerRound,
    string? Range,
    string? Ammunition,
    string? Malfunction,
    bool Impaling);

public sealed record NpcCombatRequest(int? Dodge, int? ArmorPoints, string? TacticsAndMorale, IReadOnlyList<NpcWeaponRequest>? Weapons);

public sealed record NpcSpellRequest(string? Name, string? MagicPointCost, string? Effect);

/// <summary>
/// Replaces a Human NPC's whole NPC Profile. A section that is absent or <c>null</c> is not added; an empty one is kept.
/// <c>KeeperNotes</c> is the Lexical document as a nested JSON value (ADR 0015). The request never carries derived values
/// or difficulty.
/// </summary>
public sealed record HumanNpcRequest(
    string? Name,
    int? Age,
    NpcDetailsRequest? Details,
    JsonElement? KeeperNotes,
    Dictionary<string, int?>? Characteristics,
    IReadOnlyList<NpcSkillRequest>? Skills,
    NpcCombatRequest? Combat,
    IReadOnlyList<NpcSpellRequest>? Spells);
