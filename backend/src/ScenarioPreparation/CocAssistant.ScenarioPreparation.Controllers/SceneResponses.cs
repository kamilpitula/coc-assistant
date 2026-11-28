namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>A Scene as listed on its Scenario. The position is never sent; clients use list order.</summary>
public sealed record SceneSummaryResponse(Guid Id, string Title, string Status, DateTimeOffset? StartedAt, DateTimeOffset? FinishedAt);

/// <summary>
/// A Scene with its location, Keeper notes, their own version (ADR 0037), Non-Player Entity links and Item links in the order linked, and Handout summaries in stored order. <c>Location</c> is "" when empty;
/// <c>KeeperNotes</c> is the stored document or null.
/// </summary>
public sealed record SceneResponse(
    Guid Id,
    string Title,
    string Location,
    JsonElement? KeeperNotes,
    int NotesVersion,
    string Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<NonPlayerEntityLinkResponse> NonPlayerEntityLinks,
    IReadOnlyList<ItemLinkResponse> ItemLinks,
    IReadOnlyList<HandoutSummaryResponse> Handouts);

/// <summary>A Scenario's Scenes in prepared order.</summary>
public sealed record SceneListResponse(IReadOnlyList<SceneSummaryResponse> Scenes);

/// <summary>The Keeper notes saved through the Keeper notes endpoint, with the incremented version (ADR 0037).</summary>
public sealed record SceneKeeperNotesResponse(JsonElement? KeeperNotes, int NotesVersion);
