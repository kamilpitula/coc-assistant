namespace CocAssistant.ScenePlay.Application;

/// <summary>A played Scene as the Keeper sees it (specs/scene-play/spec.md, Scene History): every Reveal newest first.</summary>
public sealed record KeeperHistorySceneView(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<InvestigatorPresentView> InvestigatorsPresent,
    IReadOnlyList<KeeperRevealView> Reveals);

/// <summary>
/// A played Scene as a Player sees it: its own Reveals only, newest first. It carries no Scenario id, no present list, no
/// recipients, and no subject ids (specs/scene-play/spec.md, Scene History).
/// </summary>
public sealed record PlayerHistorySceneView(
    Guid SceneId,
    string ScenarioTitle,
    string Title,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<PlayerRevealView> Reveals);

/// <summary>How reading the Scene History ended, by who asked and what they may see.</summary>
public abstract record SceneHistoryRead;

/// <summary>The Campaign is missing or the caller is not a member; every call answers 404.</summary>
public sealed record NotAMemberHistoryRead : SceneHistoryRead;

/// <summary>The Campaign's played Scenes as the Keeper sees them, in the port's order.</summary>
public sealed record KeeperSceneHistoryRead(IReadOnlyList<KeeperHistorySceneView> Scenes) : SceneHistoryRead;

/// <summary>The Campaign's played Scenes as a Player sees them, in the port's order, with the caller's Investigator name.</summary>
public sealed record PlayerSceneHistoryRead(string? InvestigatorName, IReadOnlyList<PlayerHistorySceneView> Scenes) : SceneHistoryRead;
