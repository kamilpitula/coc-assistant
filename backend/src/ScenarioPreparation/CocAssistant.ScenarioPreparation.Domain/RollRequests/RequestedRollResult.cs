namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>Why a Requested Roll did not roll: it is not the Investigator's roll, or it already rolled.</summary>
public enum RequestedRollOutcome
{
    Rolled,
    InvestigatorNotRequested,
    NotWaiting,
}

/// <summary>The roll outcome, with the roll only when it rolled.</summary>
public sealed record RequestedRollResult(RequestedRollOutcome Outcome, RequestedRoll? Roll);
