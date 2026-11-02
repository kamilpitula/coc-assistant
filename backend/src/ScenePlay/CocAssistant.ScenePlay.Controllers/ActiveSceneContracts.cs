namespace CocAssistant.ScenePlay.Controllers;

/// <summary>Starts a Scene. A missing list counts as empty and is a 400 keyed <c>presentInvestigatorIds</c>.</summary>
public record StartSceneRequest(IReadOnlyList<Guid>? PresentInvestigatorIds, bool FinishActiveScene);

/// <summary>Replaces the Investigators present. A missing list counts as empty.</summary>
public record ChangePresentInvestigatorsRequest(IReadOnlyList<Guid>? PresentInvestigatorIds);

public record InvestigatorPresentResponse(Guid Id, string? Name);

/// <summary>The Keeper's Active Scene. <c>Reveals</c> is always present: every Reveal of the Scene, newest first.</summary>
public record KeeperActiveSceneResponse(
    Guid SceneId,
    Guid ScenarioId,
    string ScenarioTitle,
    string Title,
    string Location,
    DateTimeOffset? StartedAt,
    IReadOnlyList<InvestigatorPresentResponse> InvestigatorsPresent,
    IReadOnlyList<KeeperRevealResponse> Reveals);

public record PlayerInvestigatorPresentResponse(string? Name, bool IsYours);

/// <summary>The Active Scene for a Player whose Investigator is present. <c>Reveals</c> holds only what reached their Investigator. It never carries an Investigator id.</summary>
public record PresentPlayerActiveSceneResponse(
    bool IsPresent,
    string Title,
    string Location,
    IReadOnlyList<PlayerInvestigatorPresentResponse> InvestigatorsPresent,
    IReadOnlyList<PlayerRevealResponse> Reveals);

/// <summary>The Active Scene for any other Player: exactly the title and <c>isPresent: false</c>.</summary>
public record AbsentPlayerActiveSceneResponse(string Title, bool IsPresent);

/// <summary>The titles and field messages of the Scene Play problems.</summary>
internal static class ActiveSceneProblems
{
    public const string PresentKey = "presentInvestigatorIds";
    public const string NotPreparedTitle = "Only a Prepared Scene can be started.";
    public const string AnotherSceneActiveTitle = "Another Scene is Active.";
    public const string NoActiveSceneTitle = "No Scene is Active.";
    public const string EmptyPresentMessage = "Choose at least one Investigator present.";
    public const string DuplicatePresentMessage = "Each Investigator can be present only once.";
    public const string NotApprovedPresentMessage = "Only Approved Investigators of this Campaign can be present.";
}
