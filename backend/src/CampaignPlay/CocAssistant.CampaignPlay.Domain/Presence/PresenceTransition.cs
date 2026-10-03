namespace CocAssistant.CampaignPlay.Domain.Presence;

/// <summary>A Campaign Member's Presence changed; members are identified by their memberId, never by Account id.</summary>
public sealed record PresenceTransition(Guid MemberId, MemberPresence Presence);
