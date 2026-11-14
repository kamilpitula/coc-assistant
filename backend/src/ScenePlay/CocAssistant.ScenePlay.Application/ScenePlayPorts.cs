namespace CocAssistant.ScenePlay.Application;

/// <summary>The part a member plays in a Campaign, as Scene Play needs it.</summary>
public enum CampaignMemberRole
{
    Keeper,
    Player,
}

/// <summary>Consumer-owned port (ADR 0008): the caller's role in a Campaign, or null when the caller is not a member.</summary>
public interface ICampaignRoles
{
    Task<CampaignMemberRole?> RoleOfAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken);
}

/// <summary>An Approved Investigator: its id, its Player's Account, and its name from the Character Sheet.</summary>
public sealed record ApprovedInvestigatorRef(Guid InvestigatorId, Guid PlayerAccountId, string Name);

/// <summary>Consumer-owned port (ADR 0008): the Approved Investigators of a Campaign.</summary>
public interface IApprovedInvestigators
{
    Task<IReadOnlyList<ApprovedInvestigatorRef>> ListAsync(Guid campaignId, CancellationToken cancellationToken);
}

/// <summary>A Scene as Scene Play shows it, with the ids of the Investigators present and its Reveals.</summary>
public sealed record PlayableScene(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    string Location,
    DateTimeOffset? StartedAt,
    IReadOnlyList<Guid> InvestigatorsPresent,
    IReadOnlyList<SceneRevealRecord> Reveals);

/// <summary>How starting a Scene ended. The checks run in this order; Conflict is a lost race, never retried (ADR 0025).</summary>
public enum StartSceneOutcome
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

/// <summary>A Requested Roll a Scene exit cancelled: its request, its Investigator, and the request's visibility for the live signal.</summary>
public sealed record CancelledRequestedRoll(Guid RollRequestId, Guid InvestigatorId, RollRequestVisibility Visibility);

/// <summary>The started Scene, and the Scene finished with it, when <see cref="StartSceneOutcome.Started"/>; otherwise null. The cancelled rolls are the finished Scene's Waiting Requested Rolls.</summary>
public sealed record StartSceneResult(
    StartSceneOutcome Outcome,
    PlayableScene? Started,
    PlayableScene? Finished,
    IReadOnlyList<CancelledRequestedRoll> CancelledRolls);

/// <summary>How finishing the Active Scene ended. NotFound is for a caller who is not the Keeper.</summary>
public enum FinishSceneOutcome
{
    Finished,
    NotFound,
    NoActiveScene,
    Conflict,
}

/// <summary>The finished Scene when <see cref="FinishSceneOutcome.Finished"/>, otherwise null. The cancelled rolls are its Waiting Requested Rolls.</summary>
public sealed record FinishSceneResult(
    FinishSceneOutcome Outcome,
    PlayableScene? Finished,
    IReadOnlyList<CancelledRequestedRoll> CancelledRolls);

/// <summary>How changing the Investigators present ended. NotFound is for a caller who is not the Keeper.</summary>
public enum ChangePresentOutcome
{
    Replaced,
    NotFound,
    NoActiveScene,
    NoInvestigatorPresent,
    DuplicateInvestigator,
    InvestigatorNotApproved,
    Conflict,
}

/// <summary>The Active Scene when <see cref="ChangePresentOutcome.Replaced"/>, otherwise null. The cancelled rolls are the Waiting Requested Rolls of the Investigators no longer present.</summary>
public sealed record ChangePresentResult(
    ChangePresentOutcome Outcome,
    PlayableScene? Scene,
    IReadOnlyList<CancelledRequestedRoll> CancelledRolls);

/// <summary>
/// Consumer-owned command port onto the Scene aggregate (ADR 0024). It performs no authorization: <see cref="ActiveSceneService"/>
/// checks the Keeper before it calls.
/// </summary>
public interface IPlayableScenes
{
    Task<PlayableScene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken);

    Task<StartSceneResult> StartAsync(
        Guid campaignId,
        Guid sceneId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        bool finishActiveScene,
        CancellationToken cancellationToken);

    Task<FinishSceneResult> FinishActiveAsync(Guid campaignId, CancellationToken cancellationToken);

    Task<ChangePresentResult> ReplaceInvestigatorsPresentAsync(
        Guid campaignId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken);
}

/// <summary>Consumer-owned port: creates Wall Entries through the Campaign Play Wall Entry behavior.</summary>
public interface ISceneWallEntries
{
    /// <summary>Throws when the entry could not be created; the caller treats that as best-effort (ADR 0024).</summary>
    Task AddPublicAsync(Guid campaignId, Guid keeperAccountId, string text, CancellationToken cancellationToken);

    /// <summary>
    /// Records a Roll Request as a Public card authored by the Keeper (ADR 0033). Throws when the entry could not be
    /// created; the caller treats that as best-effort (ADR 0024).
    /// </summary>
    Task AddRollRequestAsync(Guid campaignId, Guid keeperAccountId, Guid rollRequestId, RollRequestVisibility visibility, CancellationToken cancellationToken);
}

/// <summary>A played Scene as the provider returns it: the fields history shows, the ids of the Investigators present, and its Reveals.</summary>
public sealed record PlayedScene(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    DateTimeOffset? StartedAt,
    DateTimeOffset? FinishedAt,
    IReadOnlyList<Guid> InvestigatorsPresent,
    IReadOnlyList<SceneRevealRecord> Reveals);

/// <summary>
/// Consumer-owned query port onto played Scenes (PBI-SPL-004 D1). It performs no authorization: <see cref="SceneHistoryService"/>
/// checks the member before it calls.
/// </summary>
public interface ISceneHistory
{
    /// <summary>The Campaign's played Scenes (Active and Finished), newest StartedAt first.</summary>
    Task<IReadOnlyList<PlayedScene>> ListPlayedAsync(Guid campaignId, CancellationToken cancellationToken);
}

/// <summary>Consumer-owned port: tells the Campaign's connected members that the Active Scene changed (topic activeScene, no data).</summary>
public interface IActiveSceneSignals
{
    Task ActiveSceneChangedAsync(Guid campaignId, CancellationToken cancellationToken);
}
