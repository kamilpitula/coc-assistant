namespace CocAssistant.ScenePlay.Controllers;

/// <summary>A Roll Request's target: <c>kind</c> is <c>Skill</c>, <c>Characteristic</c>, or <c>Luck</c>; a skill needs <c>skill</c> with an optional <c>specialization</c>, a characteristic needs its code (<c>STR</c>, <c>CON</c>, ...).</summary>
public record RollRequestTargetRequest(string? Kind, string? Skill, string? Specialization, string? Characteristic);

/// <summary>One Investigator's part of a create call: who rolls, with optional Difficulty and dice overriding the request's defaults.</summary>
public record RequestedRollCreateRequest(Guid InvestigatorId, string? Difficulty, int? BonusDice, int? PenaltyDice);

/// <summary>
/// Requests rolls of the Active Scene. <c>visibility</c> defaults to <c>Public</c>; a <c>KeeperOnly</c> request is rolled at
/// creation and reaches only the Keeper. A missing <c>investigators</c> list counts as empty.
/// </summary>
public record CreateRollRequestRequest(
    RollRequestTargetRequest? Target,
    string? Message,
    string? Visibility,
    string? Difficulty,
    int? BonusDice,
    int? PenaltyDice,
    IReadOnlyList<RequestedRollCreateRequest>? Investigators);

public record RollRequestTargetResponse(string Kind, string? Skill, string? Specialization, string? Characteristic);

/// <summary>A resolved percentile roll: the kept tens die, the read result, and its Success Level.</summary>
public record PercentileOutcomeResponse(
    int UnitsFace,
    IReadOnlyList<int> TensFaces,
    int KeptTens,
    int Result,
    string SuccessLevel,
    bool IsSuccess);

/// <summary>A rolled result: the dice, the faces, who rolled by display name, when, and the percentile resolution for a percentile roll.</summary>
public record CompletedRollResponse(
    string Dice,
    int Result,
    IReadOnlyList<int>? Faces,
    string? RolledBy,
    DateTimeOffset? RolledAt,
    PercentileOutcomeResponse? Percentile,
    bool? EarnsExperienceCheck);

/// <summary>One Requested Roll: the snapshot value, the effective Difficulty and dice, the status, and the result once rolled.</summary>
public record RequestedRollResponse(
    Guid InvestigatorId,
    string? InvestigatorName,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    string Difficulty,
    int BonusDice,
    int PenaltyDice,
    string Status,
    IReadOnlyList<CompletedRollResponse> Rolls);

/// <summary>A Roll Request: the snapshot target, message, visibility, defaults, and one Requested Roll per targeted Investigator.</summary>
public record RollRequestResponse(
    Guid Id,
    RollRequestTargetResponse Target,
    string? Message,
    string Visibility,
    string Difficulty,
    int BonusDice,
    int PenaltyDice,
    DateTimeOffset CreatedAt,
    IReadOnlyList<RequestedRollResponse> RequestedRolls);

/// <summary>One Waiting Requested Roll with the Roll Request's target, message, and creation time.</summary>
public record WaitingRequestedRollResponse(
    Guid RollRequestId,
    RollRequestTargetResponse Target,
    string? Message,
    DateTimeOffset CreatedAt,
    RequestedRollResponse Roll);

/// <summary>The caller's Waiting Requested Rolls in the Active Scene, oldest first.</summary>
public record WaitingRollsResponse(string InvestigatorName, IReadOnlyList<WaitingRequestedRollResponse> Rolls);

/// <summary>The titles and field messages of the Roll Request problems (ADR 0018).</summary>
internal static class RollRequestProblems
{
    public const string TargetKey = "target";
    public const string DifficultyKey = "difficulty";
    public const string VisibilityKey = "visibility";
    public const string InvestigatorsKey = "investigators";
    public const string MessageKey = "message";
    public const string DiceKey = "dice";
    public const string UnknownTargetMessage = "Choose a skill, a characteristic, or Luck to roll against.";
    public const string UnknownSkillMessage = "This skill or characteristic isn't known.";
    public const string SpecializationRequiredMessage = "Choose a specialization for this skill.";
    public const string SpecializationNotAllowedMessage = "This skill takes no specialization.";
    public const string InvestigatorNotApprovedMessage = "Only Approved Investigators of this Campaign can be asked to roll.";
    public const string EmptyInvestigatorsMessage = "Choose at least one Investigator.";
    public const string DuplicateInvestigatorMessage = "Each Investigator can be asked only once.";
    public const string InvestigatorNotPresentMessage = "Only Investigators present can be asked to roll.";
    public const string InvalidLuckTargetMessage = "Luck is always rolled at Regular difficulty with no Bonus or Penalty Dice.";
    public const string InvalidDiceMessage = "Bonus and Penalty Dice are each between 0 and 2.";
    public const string MessageTooLongMessage = "The message is at most 2000 characters.";
    public const string UnknownDifficultyMessage = "Choose Regular, Hard, or Extreme difficulty.";
    public const string UnknownVisibilityMessage = "Choose Public or Keeper only visibility.";
}
