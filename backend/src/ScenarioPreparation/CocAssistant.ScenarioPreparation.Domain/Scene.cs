namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// One of a Scenario's ordered Scenes (CONTEXT.md, Scene). It stores its Campaign id beside its Scenario id (ADR 0016),
/// owns its status and the editing rules that follow from it, and holds its place in the prepared order as Position,
/// which is never exposed to clients (ADR 0014).
/// </summary>
public class Scene
{
    public const int TitleMaxLength = 200;
    public const int LocationMaxLength = 200;

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public Guid ScenarioId { get; private set; }
    public string Title { get; private set; }
    public string Location { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received (ADR 0015), or null when the Scene has no Keeper notes.</summary>
    public string? KeeperNotes { get; private set; }

    public int Position { get; private set; }
    public SceneStatus Status { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? FinishedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Only a Prepared Scene can be removed.</summary>
    public bool IsRemovable => Status == SceneStatus.Prepared;

    private Scene()
    {
        Title = string.Empty;
        Location = string.Empty;
    }

    private Scene(Scenario scenario, string title, string location, string? keeperNotes, int position, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = scenario.CampaignId;
        ScenarioId = scenario.Id;
        Title = title;
        Location = location;
        KeeperNotes = keeperNotes;
        Position = position;
        Status = SceneStatus.Prepared;
        CreatedAt = createdAt;
    }

    /// <summary>Creates a Prepared Scene at the given position, or refuses fields outside their limits.</summary>
    public static SceneCreation Create(Scenario scenario, string title, string? location, string? keeperNotes, int position, DateTimeOffset now)
    {
        var outcome = Validate(title, location, keeperNotes, out var trimmedTitle, out var trimmedLocation);
        return outcome == SceneFieldsOutcome.Accepted
            ? new SceneCreation(outcome, new Scene(scenario, trimmedTitle, trimmedLocation, keeperNotes, position, now))
            : new SceneCreation(outcome, null);
    }

    /// <summary>
    /// Replaces the fields under the creation rules while the Scene is Prepared or Active; a refused edit changes nothing.
    /// Status is checked before the fields. Never touches Position.
    /// </summary>
    public SceneFieldsOutcome Edit(string title, string? location, string? keeperNotes)
    {
        if (Status == SceneStatus.Finished)
        {
            return SceneFieldsOutcome.SceneFinished;
        }

        var outcome = Validate(title, location, keeperNotes, out var trimmedTitle, out var trimmedLocation);
        if (outcome == SceneFieldsOutcome.Accepted)
        {
            Title = trimmedTitle;
            Location = trimmedLocation;
            KeeperNotes = keeperNotes;
        }

        return outcome;
    }

    /// <summary>Starts a Prepared Scene; any other status refuses.</summary>
    public SceneTransitionOutcome Start(DateTimeOffset now)
    {
        if (Status != SceneStatus.Prepared)
        {
            return SceneTransitionOutcome.NotAllowed;
        }

        Status = SceneStatus.Active;
        StartedAt = now;
        return SceneTransitionOutcome.Transitioned;
    }

    /// <summary>Finishes an Active Scene; any other status refuses.</summary>
    public SceneTransitionOutcome Finish(DateTimeOffset now)
    {
        if (Status != SceneStatus.Active)
        {
            return SceneTransitionOutcome.NotAllowed;
        }

        Status = SceneStatus.Finished;
        FinishedAt = now;
        return SceneTransitionOutcome.Transitioned;
    }

    /// <summary>Sets the place in the prepared order; only <see cref="SceneOrder"/> reorders.</summary>
    internal void MoveTo(int position) => Position = position;

    private static SceneFieldsOutcome Validate(string title, string? location, string? keeperNotes, out string trimmedTitle, out string trimmedLocation)
    {
        trimmedTitle = title.Trim();
        trimmedLocation = location?.Trim() ?? string.Empty;
        if (trimmedTitle.Length is 0 or > TitleMaxLength)
        {
            return SceneFieldsOutcome.InvalidTitle;
        }

        if (trimmedLocation.Length > LocationMaxLength)
        {
            return SceneFieldsOutcome.InvalidLocation;
        }

        return keeperNotes is null || RichTextDocument.Validate(keeperNotes) == RichTextOutcome.Accepted
            ? SceneFieldsOutcome.Accepted
            : SceneFieldsOutcome.InvalidKeeperNotes;
    }
}
