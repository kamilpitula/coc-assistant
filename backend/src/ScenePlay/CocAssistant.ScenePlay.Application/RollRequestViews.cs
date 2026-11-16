namespace CocAssistant.ScenePlay.Application;

/// <summary>A Roll Request's target as everyone sees it: the kind, the skill with its optional specialization, or the characteristic code (STR, CON, ...).</summary>
public sealed record RollRequestTargetView(
    RollRequestTargetKind Kind,
    string? Skill,
    string? Specialization,
    string? Characteristic);

/// <summary>A resolved percentile roll as everyone sees it: the kept tens die, the read result, and its Success Level.</summary>
public sealed record PercentileOutcomeView(
    int UnitsFace,
    IReadOnlyList<int> TensFaces,
    int KeptTens,
    int Result,
    RollSuccessLevel SuccessLevel,
    bool IsSuccess);

/// <summary>A rolled result as everyone sees it: the dice, the faces, who rolled by display name, when, the percentile resolution, and whether it is the pushed roll's record. It carries no Account id.</summary>
public sealed record CompletedRollView(
    string Dice,
    int Result,
    IReadOnlyList<int>? Faces,
    string? RolledByName,
    DateTimeOffset? RolledAt,
    PercentileOutcomeView? Percentile,
    bool? EarnsExperienceCheck,
    bool IsPushed);

/// <summary>One Requested Roll as everyone sees it: the snapshot value, the effective Difficulty and dice, the status, the push fields, whether it can be pushed, and the results once rolled. It carries no Account or Investigator id beyond its own Investigator.</summary>
public sealed record RequestedRollView(
    Guid InvestigatorId,
    string? InvestigatorName,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    RollRequestDifficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    RequestedRollStatus Status,
    string? PushJustification,
    int? PushBonusDice,
    int? PushPenaltyDice,
    bool CanBePushed,
    IReadOnlyList<CompletedRollView> Rolls);

/// <summary>A Roll Request as the caller may see it: the snapshot target, message, visibility, defaults, and one view per Requested Roll.</summary>
public sealed record RollRequestView(
    Guid Id,
    RollRequestTargetView Target,
    string? Message,
    RollRequestVisibility Visibility,
    RollRequestDifficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    DateTimeOffset CreatedAt,
    IReadOnlyList<RequestedRollView> RequestedRolls);

/// <summary>One Investigator's Waiting Requested Roll with the Roll Request's target, message, and creation time.</summary>
public sealed record WaitingRequestedRollView(
    Guid RollRequestId,
    RollRequestTargetView Target,
    string? Message,
    DateTimeOffset CreatedAt,
    RequestedRollView Roll);

/// <summary>The caller's Waiting Requested Rolls in the Active Scene, oldest first, with their Investigator's name.</summary>
public sealed record WaitingRollsResult(string InvestigatorName, IReadOnlyList<WaitingRequestedRollView> Rolls);

/// <summary>The caller's pushable Requested Rolls in the Active Scene, oldest first, with their Investigator's name: failed rolls the caller can push now, plus PushAsked ones.</summary>
public sealed record PushableRollsResult(string InvestigatorName, IReadOnlyList<WaitingRequestedRollView> Rolls);

/// <summary>How creating a Roll Request ended. NotFound is for a caller who is not the Keeper; the other refusals are checked in this order: Active Scene, shape, values, provider.</summary>
public enum CreateRollRequestOutcome
{
    Created,
    NotFound,
    NoActiveScene,
    InvalidTarget,
    InvalidDifficulty,
    InvalidVisibility,
    UnknownTarget,
    SpecializationRequired,
    SpecializationNotAllowed,
    InvestigatorNotApproved,
    EmptyInvestigators,
    DuplicateInvestigator,
    InvestigatorNotPresent,
    InvalidLuckTarget,
    InvalidDice,
    MessageTooLong,
    Conflict,
}

/// <summary>The Roll Request when <see cref="CreateRollRequestOutcome.Created"/>, otherwise null.</summary>
public sealed record CreateRollRequestResult(CreateRollRequestOutcome Outcome, RollRequestView? Request);

/// <summary>How rolling a Requested Roll ended. NotFound covers a caller who may not roll this Investigator and a missing request.</summary>
public enum RollRequestedRollOutcome
{
    Rolled,
    NotFound,
    SceneNotActive,
    NotWaiting,
    AlreadyCancelled,
}

/// <summary>The Requested Roll when <see cref="RollRequestedRollOutcome.Rolled"/>, otherwise null.</summary>
public sealed record RollRequestedRollResult(RollRequestedRollOutcome Outcome, RequestedRollView? Roll);

/// <summary>How cancelling a Requested Roll ended. NotFound covers a caller who is not the Keeper, a missing request, and an Investigator without a Requested Roll.</summary>
public enum CancelRequestedRollOutcome
{
    Cancelled,
    NotFound,
    SceneNotActive,
    NotWaiting,
    AlreadyCancelled,
}

/// <summary>The Requested Roll when <see cref="CancelRequestedRollOutcome.Cancelled"/>, otherwise null.</summary>
public sealed record CancelRequestedRollResult(CancelRequestedRollOutcome Outcome, RequestedRollView? Roll);

/// <summary>How asking to push a Requested Roll ended. NotFound covers a caller who may not ask for this Investigator (including the Keeper), a missing request, and a hidden request.</summary>
public enum AskPushOutcome
{
    Asked,
    NotFound,
    SceneNotActive,
    NotPushable,
    AlreadyCancelled,
    JustificationRequired,
    JustificationTooLong,
}

/// <summary>The Requested Roll when <see cref="AskPushOutcome.Asked"/>, otherwise null.</summary>
public sealed record AskPushResult(AskPushOutcome Outcome, RequestedRollView? Roll);

/// <summary>How approving a push ended. NotFound covers a caller who is not the Keeper, a missing request, and an Investigator without a Requested Roll.</summary>
public enum ApprovePushOutcome
{
    Approved,
    NotFound,
    SceneNotActive,
    NotPushAsked,
    AlreadyCancelled,
    InvalidDice,
}

/// <summary>The Requested Roll when <see cref="ApprovePushOutcome.Approved"/>, otherwise null.</summary>
public sealed record ApprovePushResult(ApprovePushOutcome Outcome, RequestedRollView? Roll);

/// <summary>How declining a push ended. NotFound covers a caller who is not the Keeper, a missing request, and an Investigator without a Requested Roll.</summary>
public enum DeclinePushOutcome
{
    Declined,
    NotFound,
    SceneNotActive,
    NotPushAsked,
    AlreadyCancelled,
}

/// <summary>The Requested Roll when <see cref="DeclinePushOutcome.Declined"/>, otherwise null.</summary>
public sealed record DeclinePushResult(DeclinePushOutcome Outcome, RequestedRollView? Roll);
