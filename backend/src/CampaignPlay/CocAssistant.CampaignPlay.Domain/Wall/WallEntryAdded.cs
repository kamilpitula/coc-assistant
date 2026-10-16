namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>A Wall Entry was added to a Campaign; the visibility decides who may be told.</summary>
public sealed record WallEntryAdded(Guid CampaignId, Guid WallEntryId, WallEntryVisibility Visibility) : IDomainEvent;
