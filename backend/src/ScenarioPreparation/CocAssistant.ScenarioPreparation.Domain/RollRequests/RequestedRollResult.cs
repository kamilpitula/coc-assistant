namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>Why a Requested Roll did not roll, cancel, or push: it is not the Investigator's roll, it already rolled, it was cancelled, it cannot be pushed, or its push was never asked.</summary>
public enum RequestedRollOutcome
{
    Rolled,
    Cancelled,
    PushAsked,
    Pushed,
    PushDeclined,
    InvestigatorNotRequested,
    NotWaiting,
    AlreadyCancelled,
    NotPushable,
    NotPushAsked,
    JustificationRequired,
    JustificationTooLong,
    InvalidDice,
}

/// <summary>The roll outcome, with the roll only when it transitioned (Rolled or Cancelled).</summary>
public sealed record RequestedRollResult(RequestedRollOutcome Outcome, RequestedRoll? Roll);
