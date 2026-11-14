namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// What a Roll Request can ask for. Unknown is a type the request did not name; it is refused after the Active Scene
/// check and never reaches the provider.
/// </summary>
public enum RollRequestTargetKind
{
    Unknown,
    Skill,
    Characteristic,
    Luck,
}

/// <summary>A Roll Request's target: the kind, the skill with its optional specialization, or the characteristic code (STR, CON, ...). Luck needs neither.</summary>
public sealed record RollRequestTargetInput(
    RollRequestTargetKind Kind,
    string? Skill,
    string? Specialization,
    string? Characteristic);

/// <summary>
/// The Difficulty a Requested Roll must reach. Unknown is a value the request did not name; it is refused after the
/// Active Scene check and never reaches the provider.
/// </summary>
public enum RollRequestDifficulty
{
    Unknown,
    Regular,
    Hard,
    Extreme,
}

/// <summary>
/// A Roll Request's visibility. Unknown is a value the request did not name; it is refused after the Active Scene
/// check and never reaches the provider.
/// </summary>
public enum RollRequestVisibility
{
    Unknown,
    Public,
    KeeperOnly,
}

/// <summary>Whether a Requested Roll still waits to be rolled (specs/roll-requests/spec.md).</summary>
public enum RequestedRollStatus
{
    Waiting,
    Rolled,
    Cancelled,
}

/// <summary>How well a percentile roll went, worst to best (docs/game-rules/coc7_skill_rolls_rules.md section 4.1).</summary>
public enum RollSuccessLevel
{
    Fumble,
    Failure,
    Regular,
    Hard,
    Extreme,
    Critical,
}

/// <summary>One Investigator's part of a create call: who rolls, the snapshot value, and the per-Investigator overrides.</summary>
public sealed record RequestedRollCreateInput(
    Guid InvestigatorId,
    RollRequestDifficulty? Difficulty,
    int? BonusDice,
    int? PenaltyDice);

/// <summary>Why target values cannot be read: the target is unknown or under-specified, or the Investigator is not Approved.</summary>
public enum TargetValueRefusal
{
    UnknownTarget,
    SpecializationRequired,
    SpecializationNotAllowed,
    InvestigatorNotApproved,
}

/// <summary>One Investigator's snapshot target value: the value, whether it fell back to the catalog base, and whether a success can earn an experience check.</summary>
public sealed record InvestigatorTargetValue(Guid InvestigatorId, int Value, bool UsesBaseValue, bool CanEarnExperienceCheck);

/// <summary>The target-value result: the refusal, or one value per requested Investigator in the requested order.</summary>
public sealed record TargetValueResult(TargetValueRefusal? Refusal, IReadOnlyList<InvestigatorTargetValue> Values);

/// <summary>
/// Consumer-owned port onto the Approved Character Sheet values of a Campaign (ADR 0008, ADR 0024). It performs no
/// authorization: <see cref="RollRequestService"/> checks the Keeper before it calls. Null when the Campaign is missing.
/// </summary>
public interface IInvestigatorTargetValues
{
    Task<TargetValueResult?> QueryAsync(
        Guid campaignId,
        RollRequestTargetInput target,
        IReadOnlyList<Guid> investigatorIds,
        CancellationToken cancellationToken);
}

/// <summary>A resolved percentile roll: the kept tens die, the read result, and its Success Level.</summary>
public sealed record PercentileOutcomeData(
    int UnitsFace,
    IReadOnlyList<int> TensFaces,
    int KeptTens,
    int Result,
    RollSuccessLevel SuccessLevel,
    bool IsSuccess);

/// <summary>A stored Roll Record: what it was rolled for, the dice, the faces, who rolled, when, and the percentile resolution. It carries Account ids; views never do.</summary>
public sealed record StoredRollRecord(
    string Dice,
    int Result,
    IReadOnlyList<int>? Faces,
    Guid? RolledByAccountId,
    DateTimeOffset? RolledAt,
    PercentileOutcomeData? Percentile,
    bool? EarnsExperienceCheck);

/// <summary>One Requested Roll as the provider returns it: the snapshot value, the effective Difficulty and dice, the status, and the Roll Record once rolled.</summary>
public sealed record RequestedRollRecord(
    Guid RollRequestId,
    Guid InvestigatorId,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    RollRequestDifficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    RequestedRollStatus Status,
    IReadOnlyList<StoredRollRecord> RollRecords);

/// <summary>A Roll Request as the provider returns it: the snapshot target, message, visibility, defaults, and one record per Requested Roll.</summary>
public sealed record RollRequestRecord(
    Guid Id,
    Guid CampaignId,
    Guid SceneId,
    RollRequestTargetInput Target,
    string? Message,
    RollRequestVisibility Visibility,
    RollRequestDifficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    DateTimeOffset CreatedAt,
    IReadOnlyList<RequestedRollRecord> RequestedRolls);

/// <summary>One Investigator's Waiting Requested Roll with the Roll Request's target, message, visibility, and creation time.</summary>
public sealed record WaitingRequestedRollRecord(
    Guid RollRequestId,
    RollRequestTargetInput Target,
    string? Message,
    RollRequestVisibility Visibility,
    DateTimeOffset CreatedAt,
    RequestedRollRecord Roll);

/// <summary>How creating a Roll Request through the provider ended. The domain refusals keep their names.</summary>
public enum RollRequestWriteOutcome
{
    Created,
    NoActiveScene,
    EmptyInvestigators,
    DuplicateInvestigator,
    InvestigatorNotPresent,
    InvalidTarget,
    InvalidLuckTarget,
    InvalidDice,
    MessageTooLong,
    Conflict,
}

/// <summary>The Roll Request when <see cref="RollRequestWriteOutcome.Created"/>, otherwise null.</summary>
public sealed record RollRequestWriteResult(RollRequestWriteOutcome Outcome, RollRequestRecord? Request);

/// <summary>How rolling a Requested Roll through the provider ended.</summary>
public enum RequestedRollWriteOutcome
{
    Rolled,
    Cancelled,
    NotFound,
    SceneNotActive,
    InvestigatorNotRequested,
    NotWaiting,
    AlreadyCancelled,
}

/// <summary>The Requested Roll when <see cref="RequestedRollWriteOutcome.Rolled"/> or <see cref="RequestedRollWriteOutcome.Cancelled"/>, otherwise null.</summary>
public sealed record RequestedRollWriteResult(RequestedRollWriteOutcome Outcome, RequestedRollRecord? Roll);

/// <summary>
/// Consumer-owned command port onto the Roll Request aggregate (ADR 0024, PBI-DICE-005 D1). It performs no authorization:
/// <see cref="RollRequestService"/> checks the Keeper, or the Player's ownership, before it calls.
/// </summary>
public interface IRollRequests
{
    /// <summary>A Roll Request of the Campaign; null when it is not in the Campaign.</summary>
    Task<RollRequestRecord?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken);

    /// <summary>The Active Scene's Roll Requests, oldest first; an empty list when no Scene is Active.</summary>
    Task<IReadOnlyList<RollRequestRecord>> ListForActiveSceneAsync(Guid campaignId, CancellationToken cancellationToken);

    /// <summary>The Investigator's Waiting Requested Rolls in the Active Scene, oldest first; an empty list when no Scene is Active.</summary>
    Task<IReadOnlyList<WaitingRequestedRollRecord>> ListWaitingForInvestigatorAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken);

    /// <summary>Creates a Roll Request on the Active Scene; the snapshot values come from the caller and a KeeperOnly request is rolled for the Keeper at creation.</summary>
    Task<RollRequestWriteResult> CreateAsync(
        Guid campaignId,
        RollRequestTargetInput target,
        string? message,
        RollRequestVisibility visibility,
        RollRequestDifficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRollValueInput> investigators,
        Guid keeperAccountId,
        CancellationToken cancellationToken);

    /// <summary>Rolls the Investigator's Requested Roll with the server's dice.</summary>
    Task<RequestedRollWriteResult> RollAsync(
        Guid campaignId,
        Guid requestId,
        Guid investigatorId,
        Guid rollerAccountId,
        CancellationToken cancellationToken);

    /// <summary>Cancels the Investigator's Waiting Requested Roll.</summary>
    Task<RequestedRollWriteResult> CancelAsync(
        Guid campaignId,
        Guid requestId,
        Guid investigatorId,
        CancellationToken cancellationToken);
}

/// <summary>One Investigator's snapshot value for a create call: who rolls, the value, and the per-Investigator overrides.</summary>
public sealed record RequestedRollValueInput(
    Guid InvestigatorId,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    RollRequestDifficulty? Difficulty,
    int? BonusDice,
    int? PenaltyDice);

/// <summary>Consumer-owned port: tells the Campaign's connected members that a Roll Request changed (topics rollRequests and myRequestedRolls, no data).</summary>
public interface IRollRequestSignals
{
    Task RollRequestChangedAsync(
        Guid campaignId,
        RollRequestVisibility visibility,
        IReadOnlyCollection<Guid> playerAccountIds,
        CancellationToken cancellationToken);
}

/// <summary>Consumer-owned port: the display name of each known Account; unknown ids are omitted.</summary>
public interface IAccountNames
{
    Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(
        IReadOnlyCollection<Guid> accountIds,
        CancellationToken cancellationToken);
}
