namespace CocAssistant.CampaignPlay.Application;

/// <summary>How much of a member's Investigator the caller may see in the roster.</summary>
public enum InvestigatorVisibility
{
    Visible,
    InProgress,
    NotReady,
}

/// <summary>
/// A member's Investigator as projected for the caller (specs/campaign-overview/spec.md, Roster with Investigators).
/// Id, Name, and Status are set only when Visible, and Id only for the Keeper.
/// </summary>
public sealed record RosterInvestigator(InvestigatorVisibility Visibility, Guid? Id, string? Name, InvestigatorStatus? Status);
