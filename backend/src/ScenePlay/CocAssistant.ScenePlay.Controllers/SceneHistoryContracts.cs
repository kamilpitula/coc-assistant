namespace CocAssistant.ScenePlay.Controllers;

/// <summary>A played Scene as the Keeper sees it: every Reveal with its recipients, and the Investigators present.</summary>
public record KeeperHistorySceneResponse(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<InvestigatorPresentResponse> InvestigatorsPresent,
    IReadOnlyList<KeeperRevealResponse> Reveals);

/// <summary>The Campaign's played Scenes as the Keeper sees them, newest started first.</summary>
public record KeeperSceneHistoryResponse(IReadOnlyList<KeeperHistorySceneResponse> Scenes);

/// <summary>
/// A played Scene as a Player sees it: the Scenario title with only the Reveals that reached their Investigator. It carries no
/// Scenario id, no present list, no recipients, and no subject ids.
/// </summary>
public record PlayerHistorySceneResponse(
    Guid SceneId,
    string ScenarioTitle,
    string Title,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<PlayerRevealResponse> Reveals);

/// <summary>The Campaign's played Scenes as a Player sees them, newest started first, with their Investigator's name.</summary>
public record PlayerSceneHistoryResponse(string? InvestigatorName, IReadOnlyList<PlayerHistorySceneResponse> Scenes);
