namespace CocAssistant.ScenePlay.Application;

/// <summary>How giving an Item ended in the provider; the refusals are the provider's, in its order.</summary>
public enum ItemGiveOutcome
{
    Given,
    ItemNotFound,
    NoActiveScene,
    NotLinked,
    RecipientNotPresent,
    AlreadyHolder,
    Conflict,
}

/// <summary>The give Reveal and the former holder (when the Item moved) when <see cref="ItemGiveOutcome.Given"/>; otherwise nulls.</summary>
public sealed record ItemGiveRecordResult(ItemGiveOutcome Outcome, SceneRevealRecord? Reveal, Guid? FormerHolderId);

/// <summary>How taking back an Item ended in the provider.</summary>
public enum ItemTakeBackOutcome
{
    TakenBack,
    ItemNotFound,
    NotHeld,
    Conflict,
}

/// <summary>The former holder when <see cref="ItemTakeBackOutcome.TakenBack"/>; otherwise null.</summary>
public sealed record ItemTakeBackRecordResult(ItemTakeBackOutcome Outcome, Guid? FormerHolderId);

/// <summary>A held Item as the provider returns it: its id and the give Reveal snapshot that set the holder.</summary>
public sealed record HeldItemRecord(Guid ItemId, SceneRevealRecord GiveReveal);

/// <summary>
/// Consumer-owned command port onto an Item's holder (ADR 0008, ADR 0024; PBI-SPL-003 D1). It performs no authorization:
/// <see cref="ItemHolderService"/> checks the Keeper, or the Player's holder status, before it calls.
/// </summary>
public interface ISceneItemHolders
{
    /// <summary>Gives the Item to the Investigator, moving it when someone else holds it.</summary>
    Task<ItemGiveRecordResult> GiveAsync(Guid campaignId, Guid itemId, Guid investigatorId, CancellationToken cancellationToken);

    /// <summary>Takes the Item back; taking back an unheld Item changes nothing.</summary>
    Task<ItemTakeBackRecordResult> TakeBackAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>The Items the Investigator holds with their give Reveal snapshots, newest first.</summary>
    Task<IReadOnlyList<HeldItemRecord>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken);
}

/// <summary>Consumer-owned port: tells the Keeper and the gaining and losing Players' accounts that an Item's holder changed (PBI-SPL-003 D5).</summary>
public interface IItemHolderSignals
{
    Task ItemHolderChangedAsync(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId, CancellationToken cancellationToken);
}
