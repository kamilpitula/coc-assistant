namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>Why a Requested Roll did not roll or cancel: it is not the Investigator's roll, it already rolled, or it was cancelled.</summary>
public enum RequestedRollOutcome
{
    Rolled,
    Cancelled,
    InvestigatorNotRequested,
    NotWaiting,
    AlreadyCancelled,
}

/// <summary>The roll outcome, with the roll only when it transitioned (Rolled or Cancelled).</summary>
public sealed record RequestedRollResult(RequestedRollOutcome Outcome, RequestedRoll? Roll);
