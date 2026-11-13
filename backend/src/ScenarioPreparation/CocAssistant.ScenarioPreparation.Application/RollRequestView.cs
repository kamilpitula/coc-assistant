namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Roll Request as the provider caller sees it: the snapshot target, message, visibility, defaults, and one view per Requested Roll.</summary>
public sealed record RollRequestView(
    Guid Id,
    Guid CampaignId,
    Guid SceneId,
    RollTarget Target,
    string? Message,
    RollRequestVisibility Visibility,
    Difficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    DateTimeOffset CreatedAt,
    IReadOnlyList<RequestedRollView> RequestedRolls);

/// <summary>One Requested Roll with its snapshot target value, effective Difficulty and dice, status, and Roll Records.</summary>
public sealed record RequestedRollView(
    Guid RollRequestId,
    Guid InvestigatorId,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    Difficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    RequestedRollStatus Status,
    IReadOnlyList<RollRecord> RollRecords);

/// <summary>One Investigator's Waiting Requested Roll with the Roll Request's target, message, visibility, and creation time (specs/roll-requests/spec.md).</summary>
public sealed record WaitingRequestedRollView(
    Guid RollRequestId,
    RollTarget Target,
    string? Message,
    RollRequestVisibility Visibility,
    DateTimeOffset CreatedAt,
    RequestedRollView Roll);
