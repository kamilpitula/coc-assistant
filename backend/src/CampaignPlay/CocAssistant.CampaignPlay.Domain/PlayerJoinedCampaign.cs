namespace CocAssistant.CampaignPlay.Domain;

/// <summary>An Account became a Player of a Campaign through its Campaign Invite.</summary>
public sealed record PlayerJoinedCampaign(Guid CampaignId, Guid CampaignPlayerId, Guid AccountId, DateTimeOffset JoinedAt) : IDomainEvent;
