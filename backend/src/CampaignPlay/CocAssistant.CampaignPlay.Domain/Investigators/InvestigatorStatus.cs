namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>The Investigator lifecycle statuses (CONTEXT.md, Character Readiness).</summary>
public enum InvestigatorStatus
{
    Draft,
    Submitted,
    ChangesRequested,
    Approved,
}
