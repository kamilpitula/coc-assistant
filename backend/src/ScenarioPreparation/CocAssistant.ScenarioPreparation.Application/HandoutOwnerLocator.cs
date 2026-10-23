namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Finds the owner of a request's Handouts for its Campaign's Keeper. The Keeper check runs first, so anyone else, a missing
/// owner, or an owner of another Campaign or Scenario ends as null before any owner is read (ADR 0013, ADR 0016). An Item owner
/// is loaded together with whether the Item is in play (ADR 0022).
/// </summary>
public class HandoutOwnerLocator
{
    private readonly ICampaignKeepers _keepers;
    private readonly ISceneRepository _scenes;
    private readonly IItemRepository _items;
    private readonly IItemUsage _itemUsage;
    private readonly IItemHolders _itemHolders;

    public HandoutOwnerLocator(ICampaignKeepers keepers, ISceneRepository scenes, IItemRepository items, IItemUsage itemUsage, IItemHolders itemHolders)
    {
        _keepers = keepers;
        _scenes = scenes;
        _items = items;
        _itemUsage = itemUsage;
        _itemHolders = itemHolders;
    }

    public async Task<IHandoutOwner?> FindAsync(Guid campaignId, Guid callerAccountId, HandoutOwnerReference reference, CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return null;
        }

        return reference switch
        {
            SceneHandoutOwnerReference scene => await FindSceneAsync(campaignId, scene, cancellationToken),
            ItemHandoutOwnerReference item => await FindItemAsync(campaignId, item, cancellationToken),
            _ => null,
        };
    }

    private async Task<IHandoutOwner?> FindSceneAsync(Guid campaignId, SceneHandoutOwnerReference reference, CancellationToken cancellationToken)
    {
        var scene = await _scenes.FindByIdAsync(campaignId, reference.ScenarioId, reference.SceneId, cancellationToken);
        return scene is null ? null : new SceneHandoutOwner(scene, _scenes);
    }

    private async Task<IHandoutOwner?> FindItemAsync(Guid campaignId, ItemHandoutOwnerReference reference, CancellationToken cancellationToken)
    {
        var item = await _items.FindByIdAsync(campaignId, reference.ItemId, cancellationToken);
        if (item is null)
        {
            return null;
        }

        var isInPlay = await _itemUsage.IsLinkedToPlayedSceneAsync(campaignId, item.Id, cancellationToken)
            || await _itemHolders.FindHolderAsync(campaignId, item.Id, cancellationToken) is not null;
        return new ItemHandoutOwner(item, isInPlay, _items);
    }
}
