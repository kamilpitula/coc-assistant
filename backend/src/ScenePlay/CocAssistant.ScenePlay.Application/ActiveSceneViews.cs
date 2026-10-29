namespace CocAssistant.ScenePlay.Application;

/// <summary>An Investigator present as the Keeper sees it. The name comes from the Character Sheet and may be null.</summary>
public sealed record InvestigatorPresentView(Guid Id, string? Name);

/// <summary>
/// A Reveal as a Player sees it: the snapshot only. It carries no subject id, no recipients, and no other Investigator's id, so a
/// Player never learns who else received it (PBI-SPL-002 D5).
/// </summary>
public sealed record PlayerRevealView(
    Guid RevealId,
    DateTimeOffset RevealedAt,
    RevealSubjectKind SubjectType,
    string Title,
    string? HandoutKind,
    string? Content,
    RevealedFileDetails? File,
    string? ImageDescription);

/// <summary>An Investigator a Reveal reached, as the Keeper sees it. The name may be null when the Investigator is no longer Approved.</summary>
public sealed record RevealRecipientView(Guid Id, string? Name);

/// <summary>A Reveal as the Keeper sees it: the Player view plus the subject id and the recipients.</summary>
public sealed record KeeperRevealView(PlayerRevealView Reveal, Guid SubjectId, IReadOnlyList<RevealRecipientView> Recipients);

/// <summary>A Clue: a Reveal that reached an Investigator with the Scene it was made on (CONTEXT.md, Clue).</summary>
public sealed record ClueView(PlayerRevealView Reveal, Guid SceneId, string SceneTitle);

/// <summary>The Active Scene as the Keeper sees it (specs/scene-play/spec.md, API Contracts), with every Reveal newest first.</summary>
public sealed record KeeperActiveSceneView(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    string Location,
    DateTimeOffset? StartedAt,
    IReadOnlyList<InvestigatorPresentView> InvestigatorsPresent,
    IReadOnlyList<KeeperRevealView> Reveals);

/// <summary>An Investigator present as a Player sees it: a name and whether it is theirs, never an id.</summary>
public sealed record PlayerInvestigatorPresentView(string? Name, bool IsYours);

/// <summary>The Active Scene as a Player whose Investigator is present sees it, with the Reveals that reached their Investigator newest first.</summary>
public sealed record PresentPlayerActiveSceneView(
    string Title,
    string Location,
    IReadOnlyList<PlayerInvestigatorPresentView> InvestigatorsPresent,
    IReadOnlyList<PlayerRevealView> Reveals);

/// <summary>How reading the Active Scene ended, by who asked and what they may see.</summary>
public abstract record ActiveSceneRead;

/// <summary>The Campaign is missing or the caller is not a member; every call answers 404.</summary>
public sealed record NotAMemberRead : ActiveSceneRead;

/// <summary>No Scene is Active.</summary>
public sealed record NothingActive : ActiveSceneRead;

public sealed record KeeperActiveSceneRead(KeeperActiveSceneView Scene) : ActiveSceneRead;

public sealed record PresentPlayerActiveSceneRead(PresentPlayerActiveSceneView Scene) : ActiveSceneRead;

/// <summary>A Player whose Investigator is not present (including none, or not Approved) sees only the title.</summary>
public sealed record AbsentPlayerActiveSceneRead(string Title) : ActiveSceneRead;

/// <summary>The Keeper's view when <see cref="StartSceneOutcome.Started"/>, otherwise null.</summary>
public sealed record StartSceneViewResult(StartSceneOutcome Outcome, KeeperActiveSceneView? Scene);

/// <summary>The Keeper's view when <see cref="ChangePresentOutcome.Replaced"/>, otherwise null.</summary>
public sealed record ChangePresentViewResult(ChangePresentOutcome Outcome, KeeperActiveSceneView? Scene);
