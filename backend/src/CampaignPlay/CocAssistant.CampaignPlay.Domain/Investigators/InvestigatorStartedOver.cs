namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>A Player deleted their Draft Investigator to start over.</summary>
public sealed record InvestigatorStartedOver(Guid CampaignId, Guid InvestigatorId, Guid PlayerAccountId) : IDomainEvent;
