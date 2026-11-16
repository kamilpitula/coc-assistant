namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// A Scene as Scene Play sees it: the fields it shows, the ids of the Investigators present, and its Reveals newest first. It
/// carries no Keeper notes, links, or Handouts; Scene Play reaches only what was revealed (ADR 0024, PBI-SPL-002 D5).
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
    IReadOnlyList<Guid> InvestigatorsPresent,
    IReadOnlyList<RevealView> Reveals);

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

/// <summary>The started Scene, and the Scene that was finished with it, when <see cref="SceneStartOutcome.Started"/>; otherwise null. The closed rolls are the finished Scene's cancelled and declined Requested Rolls.</summary>
public sealed record SceneStartResult(
    SceneStartOutcome Outcome,
    PlayableSceneView? Started,
    PlayableSceneView? Finished,
    IReadOnlyList<ClosedRequestedRoll> ClosedRolls);

/// <summary>How finishing the Active Scene ended.</summary>
public enum SceneFinishOutcome
{
    Finished,
    NoActiveScene,
    Conflict,
}

/// <summary>The finished Scene when <see cref="SceneFinishOutcome.Finished"/>, otherwise null. The closed rolls are its cancelled and declined Requested Rolls.</summary>
public sealed record SceneFinishResult(
    SceneFinishOutcome Outcome,
    PlayableSceneView? Finished,
    IReadOnlyList<ClosedRequestedRoll> ClosedRolls);

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

/// <summary>The Active Scene when <see cref="InvestigatorsPresentOutcome.Replaced"/>, otherwise null. The closed rolls are the cancelled and declined Requested Rolls of the Investigators no longer present.</summary>
public sealed record InvestigatorsPresentResult(
    InvestigatorsPresentOutcome Outcome,
    PlayableSceneView? Scene,
    IReadOnlyList<ClosedRequestedRoll> ClosedRolls);

/// <summary>A Requested Roll a Scene exit closed (cancelled, or declined back to Rolled): its request, its Investigator, and the request's visibility for the live signal.</summary>
public sealed record ClosedRequestedRoll(Guid RollRequestId, Guid InvestigatorId, RollRequestVisibility Visibility);
