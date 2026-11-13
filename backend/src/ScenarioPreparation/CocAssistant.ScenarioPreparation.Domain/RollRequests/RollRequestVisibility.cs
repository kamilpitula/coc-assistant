namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>A Roll Request's visibility: a Public card every member reads, or a Keeper-only roll (specs/roll-requests/spec.md).</summary>
public enum RollRequestVisibility
{
    Public,
    KeeperOnly,
}
