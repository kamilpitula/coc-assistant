namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Scene as listed on its Scenario. Its Position is never exposed; clients use list order.</summary>
public sealed record SceneSummaryView(Guid Id, string Title, SceneStatus Status, DateTimeOffset? StartedAt, DateTimeOffset? FinishedAt);

/// <summary>A Scene with its location, Keeper notes (the stored Lexical JSON text, or null), and Non-Player Entity links in the order linked, and Handout summaries in stored order.</summary>
public sealed record SceneDetailView(
    Guid Id,
    string Title,
    string Location,
    string? KeeperNotes,
    SceneStatus Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<NonPlayerEntityLinkView> NonPlayerEntityLinks,
    IReadOnlyList<HandoutSummaryView> Handouts);
