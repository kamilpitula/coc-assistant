namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>A Player started a Draft Investigator in a Campaign.</summary>
public sealed record InvestigatorCreated(Guid CampaignId, Guid InvestigatorId, Guid PlayerAccountId) : IDomainEvent;
