namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>A Wall Entry as the caller may see it: the author is a display name, never an Account id.</summary>
public sealed record WallEntryResponse(Guid Id, string Text, string Visibility, DateTimeOffset CreatedAt, string AuthorDisplayName);

/// <summary>One page of the Wall; <c>nextCursor</c> is set only when more entries visible to the caller exist.</summary>
public sealed record WallEntryPageResponse(IReadOnlyList<WallEntryResponse> Entries, string? NextCursor);
