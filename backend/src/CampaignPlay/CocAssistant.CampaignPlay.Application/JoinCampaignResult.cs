namespace CocAssistant.CampaignPlay.Application;

/// <summary>The outcome of a join attempt, plus the joined Campaign and whether a concurrent change lost the slot.</summary>
public record JoinCampaignResult(JoinCampaignOutcome Outcome, bool Conflict, Campaign? Campaign);
