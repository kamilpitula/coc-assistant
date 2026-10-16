namespace CocAssistant.CampaignPlay.Domain.Investigators;

/// <summary>The Keeper approved an Investigator (Character Approval).</summary>
public sealed record InvestigatorApproved(Guid CampaignId, Guid InvestigatorId, Guid PlayerAccountId) : IDomainEvent;
