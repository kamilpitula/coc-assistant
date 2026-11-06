namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Lists, reads, creates, edits, and deletes a Campaign's Items for its Keeper (specs/scenario-preparation/spec.md). The Keeper
/// check runs first on every operation, so a Player, another Campaign's Keeper, a missing Campaign, or an Item of another
/// Campaign all end as NotFound before any Item or usage is read (ADR 0013). An Item in play is never deleted (ADR 0022, ADR 0029).
/// </summary>
public class ItemService
{
    private readonly ICampaignKeepers _keepers;
    private readonly IItemRepository _items;
    private readonly IItemDirectory _directory;
    private readonly IItemUsage _usage;
    private readonly LinkedSceneGuard _linkedSceneGuard;
    private readonly IHandoutFileStore _fileStore;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ItemService> _logger;

    public ItemService(
        ICampaignKeepers keepers,
        IItemRepository items,
        IItemDirectory directory,
        IItemUsage usage,
        LinkedSceneGuard linkedSceneGuard,
        IHandoutFileStore fileStore,
        TimeProvider timeProvider,
        ILogger<ItemService> logger)
    {
        _keepers = keepers;
        _items = items;
        _directory = directory;
        _usage = usage;
        _linkedSceneGuard = linkedSceneGuard;
        _fileStore = fileStore;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    /// <summary>The Campaign's Items by name; null when the caller is not the Keeper.</summary>
    public async Task<IReadOnlyList<ItemSummary>?> ListAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _directory.ListForCampaignAsync(campaignId, cancellationToken)
            : null;

    /// <summary>One Item; null when the caller is not the Keeper or it is not in this Campaign.</summary>
    public async Task<ItemView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid itemId, CancellationToken cancellationToken)
    {
        var item = await FindAsync(campaignId, callerAccountId, itemId, cancellationToken);
        return item is null ? null : await ToViewAsync(item, cancellationToken);
    }

    /// <summary>Creates an Item with no Handouts and no links.</summary>
    public async Task<ItemWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        string name,
        string? playerFacingDescription,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new ItemWriteResult(ItemWriteOutcome.NotFound, null);
        }

        var creation = Item.Create(campaignId, name, playerFacingDescription, keeperNotes, _timeProvider.GetUtcNow());
        if (creation.Item is null)
        {
            return new ItemWriteResult(ToWriteOutcome(creation.Outcome), null);
        }

        _items.Add(creation.Item);
        await _items.SaveChangesAsync(cancellationToken);
        return new ItemWriteResult(ItemWriteOutcome.Saved, ToView(creation.Item, []));
    }

    /// <summary>Replaces the name, Player-facing description, and Keeper notes, whatever the status of the Scenes that link the Item.</summary>
    public async Task<ItemWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid itemId,
        string name,
        string? playerFacingDescription,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        var item = await FindAsync(campaignId, callerAccountId, itemId, cancellationToken);
        if (item is null)
        {
            return new ItemWriteResult(ItemWriteOutcome.NotFound, null);
        }

        var outcome = item.Edit(name, playerFacingDescription, keeperNotes);
        if (outcome != ItemFieldsOutcome.Accepted)
        {
            return new ItemWriteResult(ToWriteOutcome(outcome), null);
        }

        await _items.SaveChangesAsync(cancellationToken);
        return new ItemWriteResult(ItemWriteOutcome.Saved, await ToViewAsync(item, cancellationToken));
    }

    /// <summary>
    /// Deletes an Item and, with it, its Prepared links and its Handouts; the Handouts' files are deleted after the commit. A held
    /// Item is refused as held; otherwise a played or revealed Item is refused as played (a give leaves an Item Reveal, so a held
    /// Item always reports held). The delete checks the Item's version, so a give, Reveal, or blob-deleting write that wins the
    /// race is answered from the re-read Item (ADR 0029).
    /// </summary>
    public async Task<ItemDeleteOutcome> DeleteAsync(Guid campaignId, Guid callerAccountId, Guid itemId, CancellationToken cancellationToken)
    {
        var item = await FindAsync(campaignId, callerAccountId, itemId, cancellationToken);
        if (item is null)
        {
            return ItemDeleteOutcome.NotFound;
        }

        if (item.HolderInvestigatorId is not null)
        {
            return ItemDeleteOutcome.Held;
        }

        if (await _usage.IsPlayedAsync(campaignId, itemId, cancellationToken))
        {
            return ItemDeleteOutcome.LinkedToPlayedScene;
        }

        var fileKeys = item.Handouts.Select(handout => handout.FileKey).OfType<string>().ToList();

        // A start of a Scene that links this Item loses to the delete, or the delete loses to the start (ADR 0025).
        await _linkedSceneGuard.GuardItemAsync(campaignId, itemId, cancellationToken);
        _items.Remove(item);
        try
        {
            await _items.SaveChangesAsync(cancellationToken);
        }
        catch (SceneConcurrencyException)
        {
            var current = await _items.FindByIdAsync(campaignId, itemId, cancellationToken);
            return current?.HolderInvestigatorId is not null ? ItemDeleteOutcome.Held : ItemDeleteOutcome.LinkedToPlayedScene;
        }

        foreach (var fileKey in fileKeys)
        {
            await _fileStore.TryDeleteAsync(_logger, fileKey);
        }

        return ItemDeleteOutcome.Deleted;
    }

    private async Task<Item?> FindAsync(Guid campaignId, Guid callerAccountId, Guid itemId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _items.FindByIdAsync(campaignId, itemId, cancellationToken)
            : null;

    private async Task<ItemView> ToViewAsync(Item item, CancellationToken cancellationToken) =>
        ToView(
            item,
            await _usage.ListLinkedScenesAsync(item.CampaignId, item.Id, cancellationToken));

    private static ItemView ToView(Item item, IReadOnlyList<ItemScene> scenes) =>
        new(item.Id, item.Name, item.PlayerFacingDescription, item.KeeperNotes, item.HolderInvestigatorId is null ? null : new ItemHolder(item.HolderInvestigatorId.Value), item.Handouts.Select(HandoutViews.ToSummary).ToList(), scenes);

    private static ItemWriteOutcome ToWriteOutcome(ItemFieldsOutcome outcome) => outcome switch
    {
        ItemFieldsOutcome.InvalidName => ItemWriteOutcome.InvalidName,
        ItemFieldsOutcome.MissingDescription => ItemWriteOutcome.MissingDescription,
        ItemFieldsOutcome.InvalidDescription => ItemWriteOutcome.InvalidDescription,
        _ => ItemWriteOutcome.InvalidKeeperNotes,
    };
}
