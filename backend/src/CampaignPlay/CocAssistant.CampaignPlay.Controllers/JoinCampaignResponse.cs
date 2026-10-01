namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>The outcome of a join attempt and the Campaign joined, when one was.</summary>
public record JoinCampaignResponse(string Outcome, Guid? CampaignId);
