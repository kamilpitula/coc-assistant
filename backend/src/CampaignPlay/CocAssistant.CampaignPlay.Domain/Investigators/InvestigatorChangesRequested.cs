namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>The Keeper asked a Player to change an Investigator; the Change Request comment is deliberately not carried.</summary>
public sealed record InvestigatorChangesRequested(Guid CampaignId, Guid InvestigatorId, Guid PlayerAccountId) : IDomainEvent;
