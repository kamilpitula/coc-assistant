namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The server-to-client methods of the Campaign hub (ADR 0009); new data uses topics, not new methods.</summary>
public interface ICampaignClient
{
    Task PresenceChanged(PresenceChangedMessage message);

    Task CampaignDataChanged(CampaignDataChangedMessage message);
}
