namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Raised when saving an Investigator lost a race: a second Investigator for the same Player and Campaign, or a change
/// made on a stale version (ADR 0007).
/// </summary>
public class InvestigatorConflictException : Exception
{
    public InvestigatorConflictException(Exception innerException)
        : base("The Investigator was changed concurrently.", innerException)
    {
    }
}
