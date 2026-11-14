namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>Whether a Requested Roll still waits for its Investigator or the Keeper to roll it (specs/roll-requests/spec.md).</summary>
public enum RequestedRollStatus
{
    Waiting,
    Rolled,
    Cancelled,
}
