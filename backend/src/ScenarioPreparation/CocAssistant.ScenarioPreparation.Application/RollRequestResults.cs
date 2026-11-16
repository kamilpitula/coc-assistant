namespace CocAssistant.ScenarioPreparation.Application;

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
public sealed record RollRequestWriteResult(RollRequestWriteOutcome Outcome, RollRequestView? Request);

/// <summary>How rolling a Requested Roll through the provider ended.</summary>
public enum RequestedRollWriteOutcome
{
    Rolled,
    Cancelled,
    PushAsked,
    Pushed,
    PushDeclined,
    NotFound,
    SceneNotActive,
    InvestigatorNotRequested,
    NotWaiting,
    AlreadyCancelled,
    NotPushable,
    NotPushAsked,
    JustificationRequired,
    JustificationTooLong,
    InvalidDice,
}

/// <summary>The Requested Roll when it transitioned (Rolled, Cancelled, PushAsked, Pushed, or PushDeclined), otherwise null.</summary>
public sealed record RequestedRollWriteResult(RequestedRollWriteOutcome Outcome, RequestedRollView? Roll);
