namespace CocAssistant.CampaignPlay.Application;

/// <summary>The memberIds Connected in a Campaign; a roster member missing from it is Not connected.</summary>
public sealed record PresenceSnapshot(Guid CampaignId, IReadOnlyCollection<Guid> ConnectedMembers);
