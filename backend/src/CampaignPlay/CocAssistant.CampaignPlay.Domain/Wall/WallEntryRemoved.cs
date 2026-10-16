namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>The Keeper removed a Wall Entry; the visibility it had decides who may be told.</summary>
public sealed record WallEntryRemoved(Guid CampaignId, Guid WallEntryId, WallEntryVisibility Visibility) : IDomainEvent;
