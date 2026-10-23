namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Links and unlinks the Items of a Scene for its Campaign's Keeper (specs/scenario-preparation/spec.md). The Keeper check runs
/// first, so anyone else, a missing Scene, or a Scene of another Scenario or Campaign ends as NotFound before any Scene is read
/// (ADR 0013, ADR 0016). The service resolves whether the Item is in the Campaign and the Scene decides the rest, Finished first,
/// so a Finished Scene is never reported as a bad Item (PBI-SP-008 D4). Linking an Item again is a success.
/// </summary>
public class ItemLinkService
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly IItemDirectory _directory;
    private readonly TimeProvider _timeProvider;

    public ItemLinkService(ICampaignKeepers keepers, ISceneRepository scenes, IItemDirectory directory, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _scenes = scenes;
        _directory = directory;
        _timeProvider = timeProvider;
    }

    /// <summary>Links an Item of the Scene's Campaign. A missing id is the same problem as an unknown Item.</summary>
    public async Task<ItemLinkWriteResult> LinkAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        Guid sceneId,
        Guid? itemId,
        CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return new ItemLinkWriteResult(ItemLinkWriteOutcome.NotFound, null);
        }

        var items = await _directory.ListForCampaignAsync(campaignId, cancellationToken);
        var itemInCampaign = itemId is not null && items.Any(item => item.Id == itemId);
        var result = scene.LinkItem(itemId ?? Guid.Empty, itemInCampaign, _timeProvider.GetUtcNow());
        if (result.Link is null)
        {
            return new ItemLinkWriteResult(ToWriteOutcome(result.Outcome), null);
        }

        if (result.Outcome == ItemLinkOutcome.Linked)
        {
            await _scenes.SaveChangesAsync(cancellationToken);
        }

        var view = ItemLinkViews.Create([result.Link], items).Single();
        return new ItemLinkWriteResult(ToWriteOutcome(result.Outcome), view);
    }

    /// <summary>Removes a link; the Item itself is untouched.</summary>
    public async Task<ItemUnlinkOutcome> UnlinkAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, Guid linkId, CancellationToken cancellationToken)
    {
        var scene = await FindSceneAsync(campaignId, callerAccountId, scenarioId, sceneId, cancellationToken);
        if (scene is null)
        {
            return ItemUnlinkOutcome.NotFound;
        }

        var outcome = scene.UnlinkItem(linkId);
        if (outcome != ItemLinkOutcome.Unlinked)
        {
            return outcome == ItemLinkOutcome.SceneFinished ? ItemUnlinkOutcome.Finished : ItemUnlinkOutcome.NotFound;
        }

        await _scenes.SaveChangesAsync(cancellationToken);
        return ItemUnlinkOutcome.Unlinked;
    }

    private async Task<Scene?> FindSceneAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _scenes.FindByIdAsync(campaignId, scenarioId, sceneId, cancellationToken)
            : null;

    private static ItemLinkWriteOutcome ToWriteOutcome(ItemLinkOutcome outcome) => outcome switch
    {
        ItemLinkOutcome.Linked => ItemLinkWriteOutcome.Linked,
        ItemLinkOutcome.AlreadyLinked => ItemLinkWriteOutcome.AlreadyLinked,
        ItemLinkOutcome.SceneFinished => ItemLinkWriteOutcome.Finished,
        ItemLinkOutcome.ItemNotInCampaign => ItemLinkWriteOutcome.ItemNotInCampaign,
        _ => ItemLinkWriteOutcome.NotFound,
    };
}
