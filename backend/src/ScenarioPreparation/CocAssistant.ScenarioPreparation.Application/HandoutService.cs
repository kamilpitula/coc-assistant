namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Reads, adds, edits, removes, and reorders the Handouts of a Scene for its Campaign's Keeper (specs/scenario-preparation/spec.md).
/// The Keeper check runs first, so anyone else, a missing Scene, or a Scene of another Scenario or Campaign ends as NotFound
/// before any Scene is read (ADR 0013, ADR 0016). The Scene decides every change (ADR 0019, ADR 0020).
/// </summary>
public class HandoutService
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly TimeProvider _timeProvider;

    public HandoutService(ICampaignKeepers keepers, ISceneRepository scenes, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _scenes = scenes;
        _timeProvider = timeProvider;
    }

    /// <summary>The Handout with its content, or null when the caller is not the Keeper or nothing matches.</summary>
    public async Task<HandoutView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        var handout = scene?.Handouts.FirstOrDefault(candidate => candidate.Id == handoutId);
        return handout is null ? null : ToView(handout);
    }

    /// <summary>Adds a Handout after the Scene's others.</summary>
    public async Task<HandoutWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        string? content,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        return scene is null
            ? Refused(HandoutWriteOutcome.NotFound)
            : await SaveAsync(scene.AddHandout(kind, visibility, title, content, _timeProvider.GetUtcNow()), cancellationToken);
    }

    /// <summary>Replaces a Handout's kind, visibility, title, and content; its place in the order is unchanged.</summary>
    public async Task<HandoutWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        Guid handoutId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        string? content,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        return scene is null
            ? Refused(HandoutWriteOutcome.NotFound)
            : await SaveAsync(scene.EditHandout(handoutId, kind, visibility, title, content), cancellationToken);
    }

    /// <summary>Removes a Handout; only a Prepared Scene's Handouts can be removed.</summary>
    public async Task<HandoutRemoveOutcome> RemoveAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, Guid handoutId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return HandoutRemoveOutcome.NotFound;
        }

        var outcome = scene.RemoveHandout(handoutId);
        if (outcome != HandoutRemovalOutcome.Removed)
        {
            return outcome == HandoutRemovalOutcome.SceneNotPrepared ? HandoutRemoveOutcome.NotPrepared : HandoutRemoveOutcome.NotFound;
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return HandoutRemoveOutcome.Removed;
    }

    /// <summary>Renumbers the Scene's Handouts to the requested order and returns them in it.</summary>
    public async Task<HandoutReorderResult> ReorderAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        IReadOnlyList<Guid> handoutIds,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new HandoutReorderResult(HandoutReorderOutcome.NotFound, null);
        }

        var outcome = scene.ReorderHandouts(handoutIds);
        if (outcome != HandoutOrderOutcome.Reordered)
        {
            return new HandoutReorderResult(ToReorderOutcome(outcome), null);
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return new HandoutReorderResult(HandoutReorderOutcome.Reordered, scene.Handouts.Select(HandoutViews.ToSummary).ToList());
    }

    private async Task<HandoutWriteResult> SaveAsync(HandoutResult result, CancellationToken cancellationToken)
    {
        if (result.Handout is null)
        {
            return Refused(ToWriteOutcome(result.Outcome));
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return new HandoutWriteResult(HandoutWriteOutcome.Saved, ToView(result.Handout));
    }

    private async Task<Scene?> FindSceneAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken)
            : null;

    private static HandoutWriteResult Refused(HandoutWriteOutcome outcome) => new(outcome, null);

    private static HandoutView ToView(Handout handout) => new(handout.Id, handout.Kind, handout.Visibility, handout.Title, handout.Content);

    private static HandoutWriteOutcome ToWriteOutcome(HandoutOutcome outcome) => outcome switch
    {
        HandoutOutcome.SceneFinished => HandoutWriteOutcome.Finished,
        HandoutOutcome.HandoutNotFound => HandoutWriteOutcome.NotFound,
        HandoutOutcome.InvalidTitle => HandoutWriteOutcome.InvalidTitle,
        HandoutOutcome.InvalidKind => HandoutWriteOutcome.InvalidKind,
        HandoutOutcome.InvalidVisibility => HandoutWriteOutcome.InvalidVisibility,
        HandoutOutcome.MissingContent => HandoutWriteOutcome.MissingContent,
        _ => HandoutWriteOutcome.InvalidContent,
    };

    private static HandoutReorderOutcome ToReorderOutcome(HandoutOrderOutcome outcome) => outcome switch
    {
        HandoutOrderOutcome.SceneFinished => HandoutReorderOutcome.Finished,
        HandoutOrderOutcome.DuplicateIds => HandoutReorderOutcome.DuplicateIds,
        _ => HandoutReorderOutcome.DoesNotMatchHandouts,
    };
}
