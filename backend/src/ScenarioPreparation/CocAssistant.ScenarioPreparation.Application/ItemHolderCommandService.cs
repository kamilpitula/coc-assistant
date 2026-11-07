namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// The provider side of Scene Play's Item holder port (ADR 0029): gives an Item of the Campaign's Active Scene to a present
/// Investigator with one Item Reveal to the holder in the same save, takes it back leaving the give Reveal in place, and lists
/// the Items one Investigator holds. It performs no authorization; Scene Play checks the Keeper, or the Player's holder status,
/// before it calls, and no Scenario Preparation endpoint calls it.
/// </summary>
public class ItemHolderCommandService
{
    private readonly ISceneRepository _scenes;
    private readonly IItemRepository _items;
    private readonly TimeProvider _timeProvider;

    public ItemHolderCommandService(ISceneRepository scenes, IItemRepository items, TimeProvider timeProvider)
    {
        _scenes = scenes;
        _items = items;
        _timeProvider = timeProvider;
    }

    /// <summary>Gives a linked Item of the Active Scene to a present Investigator; moves it when someone else holds it.</summary>
    public async Task<ItemGiveResult> GiveAsync(Guid campaignId, Guid itemId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var item = await _items.FindByIdAsync(campaignId, itemId, cancellationToken);
        if (item is null)
        {
            return new ItemGiveResult(ItemGiveOutcome.ItemNotFound, null, null);
        }

        var scene = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (scene is null)
        {
            return new ItemGiveResult(ItemGiveOutcome.NoActiveScene, null, null);
        }

        var linked = await _items.ListLinkedForSceneAsync(campaignId, scene.Id, cancellationToken);
        if (linked.All(candidate => candidate.Id != itemId))
        {
            return new ItemGiveResult(ItemGiveOutcome.NotLinked, null, null);
        }

        var give = scene.GiveItem(item, investigatorId, _timeProvider.GetUtcNow());
        if (give.Outcome != GiveItemOutcome.Given)
        {
            return give.Outcome switch
            {
                GiveItemOutcome.RecipientNotPresent => new ItemGiveResult(ItemGiveOutcome.RecipientNotPresent, null, null),
                _ => new ItemGiveResult(ItemGiveOutcome.AlreadyHolder, null, null),
            };
        }

        try
        {
            await _items.SaveChangesAsync(cancellationToken);
        }
        catch (SceneConcurrencyException)
        {
            return new ItemGiveResult(ItemGiveOutcome.Conflict, null, null);
        }

        return new ItemGiveResult(ItemGiveOutcome.Given, RevealViews.ToView(give.Reveal!), give.FormerHolderId);
    }

    /// <summary>Takes back a held Item; the give Reveal stays, so the Item remains in play.</summary>
    public async Task<ItemTakeBackResult> TakeBackAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var item = await _items.FindByIdAsync(campaignId, itemId, cancellationToken);
        if (item is null)
        {
            return new ItemTakeBackResult(ItemTakeBackOutcome.ItemNotFound, null);
        }

        var formerHolderId = item.HolderInvestigatorId;
        if (formerHolderId is null)
        {
            return new ItemTakeBackResult(ItemTakeBackOutcome.NotHeld, null);
        }

        item.TakeBack();

        try
        {
            await _items.SaveChangesAsync(cancellationToken);
        }
        catch (SceneConcurrencyException)
        {
            return new ItemTakeBackResult(ItemTakeBackOutcome.Conflict, null);
        }

        return new ItemTakeBackResult(ItemTakeBackOutcome.TakenBack, formerHolderId);
    }

    /// <summary>The Items the Investigator holds with their give Reveal snapshots, newest first.</summary>
    public async Task<IReadOnlyList<HeldItemView>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var held = await _items.ListHeldAsync(campaignId, investigatorId, cancellationToken);
        return held.Select(entry => new HeldItemView(entry.Item.Id, investigatorId, RevealViews.ToView(entry.GiveReveal))).ToList();
    }
}
