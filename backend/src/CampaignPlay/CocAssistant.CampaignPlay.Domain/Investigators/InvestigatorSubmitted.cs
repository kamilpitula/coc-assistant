namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>A Player submitted or resubmitted an Investigator for the Keeper's review.</summary>
public sealed record InvestigatorSubmitted(Guid CampaignId, Guid InvestigatorId, Guid PlayerAccountId) : IDomainEvent;
