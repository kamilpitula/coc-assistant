namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// A Mythos Creature with its Monster Profile and everything the server works out from it: the derived values and the
/// Investigator Difficulty of each entered characteristic, each skill and each attack (parallel to the profile's lists),
/// and Dodge. Overrides stay in the profile beside the computed values. None of it is stored or accepted from a request.
/// </summary>
public sealed record MythosCreatureView(
    Guid Id,
    string Name,
    MonsterProfile Profile,
    CharacteristicDerivedValues Derived,
    IReadOnlyDictionary<string, InvestigatorDifficulty> CharacteristicDifficulties,
    IReadOnlyList<InvestigatorDifficulty> SkillDifficulties,
    IReadOnlyList<InvestigatorDifficulty> AttackDifficulties,
    InvestigatorDifficulty? DodgeDifficulty);
