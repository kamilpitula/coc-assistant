namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// A Scene as Scene Play sees it: the fields it shows and the ids of the Investigators present. It carries no Keeper notes,
/// links, or Handouts, because Scene Play reveals none of them in this version (ADR 0024).
/// </summary>
public sealed record PlayableSceneView(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    string Location,
    SceneStatus Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<Guid> InvestigatorsPresent);

/// <summary>How starting a Scene ended. The first four refusals are state; the next three are the present list; Conflict is a lost race.</summary>
public enum SceneStartOutcome
{
    Started,
    SceneNotFound,
    NotPrepared,
    ActiveSceneExists,
    NoInvestigatorPresent,
    DuplicateInvestigator,
    InvestigatorNotApproved,
    Conflict,
}

/// <summary>The started Scene, and the Scene that was finished with it, when <see cref="SceneStartOutcome.Started"/>; otherwise null.</summary>
public sealed record SceneStartResult(SceneStartOutcome Outcome, PlayableSceneView? Started, PlayableSceneView? Finished);

/// <summary>How finishing the Active Scene ended.</summary>
public enum SceneFinishOutcome
{
    Finished,
    NoActiveScene,
    Conflict,
}

/// <summary>The finished Scene when <see cref="SceneFinishOutcome.Finished"/>, otherwise null.</summary>
public sealed record SceneFinishResult(SceneFinishOutcome Outcome, PlayableSceneView? Finished);

/// <summary>How changing the Investigators present ended.</summary>
public enum InvestigatorsPresentOutcome
{
    Replaced,
    NoActiveScene,
    NoInvestigatorPresent,
    DuplicateInvestigator,
    InvestigatorNotApproved,
    Conflict,
}

/// <summary>The Active Scene when <see cref="InvestigatorsPresentOutcome.Replaced"/>, otherwise null.</summary>
public sealed record InvestigatorsPresentResult(InvestigatorsPresentOutcome Outcome, PlayableSceneView? Scene);
