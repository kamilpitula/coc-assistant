namespace CocAssistant.CampaignPlay.Application;

/// <summary>A Wall Entry as projected for one viewer: the author is a display name, never an Account id.</summary>
public sealed record WallEntryView(
    Guid Id,
    string Text,
    WallEntryVisibility Visibility,
    DateTimeOffset CreatedAt,
    string AuthorDisplayName);

/// <summary>One page of the Wall; the cursor is set only when more entries visible to the viewer exist.</summary>
public sealed record WallEntryPage(IReadOnlyList<WallEntryView> Entries, string? NextCursor);

/// <summary>The result of adding an entry; the entry is set only when it was created.</summary>
public sealed record AddWallEntryResult(WallEntryAuthoringOutcome Outcome, WallEntryView? Entry);

/// <summary>The result of removing an entry; a non-Keeper always gets <see cref="NotFound"/>, whatever the entry.</summary>
public enum RemoveWallEntryOutcome
{
    Removed,
    NotFound,
}
