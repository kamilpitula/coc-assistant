namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Links, edits, and unlinks the Non-Player Entities of a Scene for its Campaign's Keeper (specs/scenario-preparation/spec.md).
/// The Keeper check runs first, so anyone else, a missing Scene, or a Scene of another Scenario or Campaign ends as NotFound
/// before any Scene is read (ADR 0013, ADR 0016). The Scene decides every change (Finished first); an entity outside the
/// Campaign is a validation outcome, decided by the Scene after Finished, because 404 means the Scene was not found.
/// </summary>
public class NonPlayerEntityLinkService
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly INonPlayerEntityDirectory _directory;
    private readonly TimeProvider _timeProvider;

    public NonPlayerEntityLinkService(ICampaignKeepers keepers, ISceneRepository scenes, INonPlayerEntityDirectory directory, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _scenes = scenes;
        _directory = directory;
        _timeProvider = timeProvider;
    }

    /// <summary>Links an entity of the Scene's Campaign. A missing type or id is the same problem as an unknown entity.</summary>
    public async Task<NonPlayerEntityLinkWriteResult> LinkAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        NonPlayerEntityType? type,
        Guid? nonPlayerEntityId,
        string playerFacingName,
        string? playerFacingDescription,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return Refused(NonPlayerEntityLinkWriteOutcome.NotFound);
        }

        var entities = await _directory.ListForCampaignAsync(campaignId, cancellationToken);
        var entityInCampaign = type is not null && nonPlayerEntityId is not null && entities.Any(entity => entity.Type == type && entity.Id == nonPlayerEntityId);
        var result = scene.LinkNonPlayerEntity(type ?? default, nonPlayerEntityId ?? Guid.Empty, entityInCampaign, playerFacingName, playerFacingDescription, _timeProvider.GetUtcNow());
        return await SaveAsync(result, entities, cancellationToken);
    }

    /// <summary>Replaces a link's Player-facing name and description; the entity is fixed.</summary>
    public async Task<NonPlayerEntityLinkWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        Guid linkId,
        string playerFacingName,
        string? playerFacingDescription,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return Refused(NonPlayerEntityLinkWriteOutcome.NotFound);
        }

        var result = scene.EditNonPlayerEntityLink(linkId, playerFacingName, playerFacingDescription);
        return await SaveAsync(result, await _directory.ListForCampaignAsync(campaignId, cancellationToken), cancellationToken);
    }

    /// <summary>Removes a link; the profile itself is untouched.</summary>
    public async Task<NonPlayerEntityUnlinkOutcome> UnlinkAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return NonPlayerEntityUnlinkOutcome.NotFound;
        }

        var outcome = scene.UnlinkNonPlayerEntity(linkId);
        if (outcome != NonPlayerEntityLinkOutcome.Accepted)
        {
            return outcome == NonPlayerEntityLinkOutcome.SceneFinished ? NonPlayerEntityUnlinkOutcome.Finished : NonPlayerEntityUnlinkOutcome.NotFound;
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return NonPlayerEntityUnlinkOutcome.Unlinked;
    }

    private async Task<NonPlayerEntityLinkWriteResult> SaveAsync(
        NonPlayerEntityLinkResult result,
        IReadOnlyList<NonPlayerEntitySummary> entities,
        CancellationToken cancellationToken)
    {
        if (result.Link is null)
        {
            return Refused(ToWriteOutcome(result.Outcome));
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        var view = NonPlayerEntityLinkViews.Create([result.Link], entities).Single();
        return new NonPlayerEntityLinkWriteResult(NonPlayerEntityLinkWriteOutcome.Saved, view);
    }

    private async Task<Scene?> FindSceneAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken)
            : null;

    private static NonPlayerEntityLinkWriteResult Refused(NonPlayerEntityLinkWriteOutcome outcome) => new(outcome, null);

    private static NonPlayerEntityLinkWriteOutcome ToWriteOutcome(NonPlayerEntityLinkOutcome outcome) => outcome switch
    {
        NonPlayerEntityLinkOutcome.SceneFinished => NonPlayerEntityLinkWriteOutcome.Finished,
        NonPlayerEntityLinkOutcome.LinkNotFound => NonPlayerEntityLinkWriteOutcome.NotFound,
        NonPlayerEntityLinkOutcome.NonPlayerEntityNotInCampaign => NonPlayerEntityLinkWriteOutcome.NonPlayerEntityNotInCampaign,
        NonPlayerEntityLinkOutcome.InvalidPlayerFacingName => NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingName,
        _ => NonPlayerEntityLinkWriteOutcome.InvalidPlayerFacingDescription,
    };
}
