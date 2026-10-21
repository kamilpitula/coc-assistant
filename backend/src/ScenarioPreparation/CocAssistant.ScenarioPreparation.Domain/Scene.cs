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

    private readonly List<NonPlayerEntityLink> _nonPlayerEntityLinks = [];

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

    /// <summary>The Non-Player Entity links in the order linked: CreatedAt, then Id (spec.md, Scene API).</summary>
    public IReadOnlyList<NonPlayerEntityLink> NonPlayerEntityLinks =>
        _nonPlayerEntityLinks.OrderBy(link => link.CreatedAt).ThenBy(link => link.Id).ToList();

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

    /// <summary>
    /// Links a Non-Player Entity of this Scene's Campaign while the Scene is Prepared or Active. The same entity may be linked
    /// again; each link has its own id. Status is checked before the fields; a refused link changes nothing.
    /// </summary>
    public NonPlayerEntityLinkResult LinkNonPlayerEntity(NonPlayerEntityType type, Guid nonPlayerEntityId, string playerFacingName, string? playerFacingDescription, DateTimeOffset now)
    {
        if (Status == SceneStatus.Finished)
        {
            return new NonPlayerEntityLinkResult(NonPlayerEntityLinkOutcome.SceneFinished, null);
        }

        var outcome = NonPlayerEntityLink.Validate(playerFacingName, playerFacingDescription, out var trimmedName);
        if (outcome != NonPlayerEntityLinkOutcome.Accepted)
        {
            return new NonPlayerEntityLinkResult(outcome, null);
        }

        var link = NonPlayerEntityLink.Create(Id, type, nonPlayerEntityId, trimmedName, playerFacingDescription, now);
        _nonPlayerEntityLinks.Add(link);
        return new NonPlayerEntityLinkResult(outcome, link);
    }

    /// <summary>Replaces a link's Player-facing fields; the entity is fixed. Status, then the link, then the fields are checked.</summary>
    public NonPlayerEntityLinkResult EditNonPlayerEntityLink(Guid linkId, string playerFacingName, string? playerFacingDescription)
    {
        if (Status == SceneStatus.Finished)
        {
            return new NonPlayerEntityLinkResult(NonPlayerEntityLinkOutcome.SceneFinished, null);
        }

        var link = _nonPlayerEntityLinks.Find(candidate => candidate.Id == linkId);
        if (link is null)
        {
            return new NonPlayerEntityLinkResult(NonPlayerEntityLinkOutcome.LinkNotFound, null);
        }

        var outcome = NonPlayerEntityLink.Validate(playerFacingName, playerFacingDescription, out var trimmedName);
        if (outcome != NonPlayerEntityLinkOutcome.Accepted)
        {
            return new NonPlayerEntityLinkResult(outcome, null);
        }

        link.Replace(trimmedName, playerFacingDescription);
        return new NonPlayerEntityLinkResult(outcome, link);
    }

    /// <summary>Removes a link while the Scene is Prepared or Active; the profile itself is untouched.</summary>
    public NonPlayerEntityLinkOutcome UnlinkNonPlayerEntity(Guid linkId)
    {
        if (Status == SceneStatus.Finished)
        {
            return NonPlayerEntityLinkOutcome.SceneFinished;
        }

        var link = _nonPlayerEntityLinks.Find(candidate => candidate.Id == linkId);
        if (link is null)
        {
            return NonPlayerEntityLinkOutcome.LinkNotFound;
        }

        _nonPlayerEntityLinks.Remove(link);
        return NonPlayerEntityLinkOutcome.Accepted;
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
