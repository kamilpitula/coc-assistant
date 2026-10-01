namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>A request from an authenticated Account to join a Campaign through a Campaign Invite token.</summary>
public record JoinCampaignRequest([Required] string Token);
