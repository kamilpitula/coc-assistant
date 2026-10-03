namespace CocAssistant.CampaignPlay.Controllers;

// Wire messages of the Campaign hub (specs/campaign-play/spec.md, Live connection contract). Presence values use
// PascalCase names; topics use camelCase names. memberIds are opaque strings, never Account ids.

/// <summary>A member's Presence in a snapshot; members missing from it are Not connected.</summary>
public sealed record MemberPresenceMessage(string MemberId, string Presence);

/// <summary>Returned by SubscribeToCampaign.</summary>
public sealed record PresenceSnapshotMessage(Guid CampaignId, IReadOnlyList<MemberPresenceMessage> Members);

/// <summary>Sent to campaign:{campaignId} when a member's Presence changes.</summary>
public sealed record PresenceChangedMessage(Guid CampaignId, string MemberId, string Presence);

/// <summary>An invalidation signal: the client refetches the data behind each topic through REST.</summary>
public sealed record CampaignDataChangedMessage(Guid CampaignId, IReadOnlyList<string> Topics);
