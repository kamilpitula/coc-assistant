namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Makes a delete of material that Prepared Scenes link lose to a start of one of those Scenes (ADR 0025, D6). It loads the
/// Prepared Scenes that link the target and increments their versions in the caller's save, so a start that commits in between
/// makes one of the two saves fail with <see cref="SceneConcurrencyException"/>. The caller keeps its own usage check.
/// </summary>
public class LinkedSceneGuard
{
    private readonly ISceneRepository _scenes;

    public LinkedSceneGuard(ISceneRepository scenes)
    {
        _scenes = scenes;
    }

    public async Task GuardNonPlayerEntityAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken) =>
        Guard(await _scenes.ListTrackedPreparedLinkingNonPlayerEntityAsync(campaignId, type, nonPlayerEntityId, cancellationToken));

    public async Task GuardItemAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken) =>
        Guard(await _scenes.ListTrackedPreparedLinkingItemAsync(campaignId, itemId, cancellationToken));

    /// <summary>Increments the version of each given Scene that is still Prepared.</summary>
    public static void Guard(IEnumerable<Scene> preparedScenes)
    {
        foreach (var scene in preparedScenes)
        {
            scene.GuardLinkedMaterialRemoval();
        }
    }
}
