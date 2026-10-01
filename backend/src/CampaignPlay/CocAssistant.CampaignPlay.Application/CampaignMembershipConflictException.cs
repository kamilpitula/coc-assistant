namespace CocAssistant.CampaignPlay.Application;

/// <summary>Signals that a concurrent membership change won the race, so this Save could not be applied.</summary>
public sealed class CampaignMembershipConflictException : Exception
{
    public CampaignMembershipConflictException(Exception innerException)
        : base("The Campaign membership changed concurrently.", innerException)
    {
    }
}
