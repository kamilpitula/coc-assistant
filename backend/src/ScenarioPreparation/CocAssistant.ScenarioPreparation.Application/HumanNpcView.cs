namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// A Human NPC with its NPC Profile and everything the server works out from it: the derived values and the Investigator
/// Difficulty of each entered characteristic, each skill (parallel to <c>Profile.Skills</c>), and Dodge. None of it is
/// stored or accepted from a request.
/// </summary>
public sealed record HumanNpcView(
    Guid Id,
    string Name,
    NpcProfile Profile,
    NpcDerivedValues Derived,
    IReadOnlyDictionary<string, InvestigatorDifficulty> CharacteristicDifficulties,
    IReadOnlyList<InvestigatorDifficulty> SkillDifficulties,
    InvestigatorDifficulty? DodgeDifficulty);
