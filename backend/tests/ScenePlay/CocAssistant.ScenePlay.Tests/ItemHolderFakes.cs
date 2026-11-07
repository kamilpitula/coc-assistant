namespace CocAssistant.ScenePlay.Tests;

/// <summary>Records each call and answers with set results, so the Item holder service's decisions are observable.</summary>
public sealed class FakeSceneItemHolders : ISceneItemHolders
{
    public List<string> Calls { get; } = [];

    public ItemGiveRecordResult GiveResult { get; set; } = new(ItemGiveOutcome.NoActiveScene, null, null);

    public ItemTakeBackRecordResult TakeBackResult { get; set; } = new(ItemTakeBackOutcome.NotHeld, null);

    public List<HeldItemRecord> Held { get; } = [];

    public (Guid ItemId, Guid InvestigatorId)? LastGive { get; private set; }

    public Guid? LastTakeBack { get; private set; }

    public Guid? LastHeldInvestigatorId { get; private set; }

    public Task<ItemGiveRecordResult> GiveAsync(Guid campaignId, Guid itemId, Guid investigatorId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(GiveAsync));
        LastGive = (itemId, investigatorId);
        return Task.FromResult(GiveResult);
    }

    public Task<ItemTakeBackRecordResult> TakeBackAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(TakeBackAsync));
        LastTakeBack = itemId;
        return Task.FromResult(TakeBackResult);
    }

    public Task<IReadOnlyList<HeldItemRecord>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListHeldAsync));
        LastHeldInvestigatorId = investigatorId;
        return Task.FromResult<IReadOnlyList<HeldItemRecord>>(Held.ToList());
    }
}

public sealed class RecordingItemHolderSignals : IItemHolderSignals
{
    public List<(Guid? Gainer, Guid? Loser)> Changes { get; } = [];

    public bool Fail { get; set; }

    public Task ItemHolderChangedAsync(Guid campaignId, Guid? gainerAccountId, Guid? loserAccountId, CancellationToken cancellationToken)
    {
        if (Fail)
        {
            throw new InvalidOperationException("The hub is down.");
        }

        Changes.Add((gainerAccountId, loserAccountId));
        return Task.CompletedTask;
    }
}
