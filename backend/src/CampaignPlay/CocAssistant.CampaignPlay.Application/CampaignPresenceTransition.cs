namespace CocAssistant.CampaignPlay.Application;

/// <summary>A member's Presence transition within one Campaign.</summary>
public sealed record CampaignPresenceTransition(Guid CampaignId, PresenceTransition Transition);
