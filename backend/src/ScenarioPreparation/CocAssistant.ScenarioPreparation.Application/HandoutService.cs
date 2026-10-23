namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Reads, adds, edits, removes, and reorders the Handouts of a Scene or an Item for its Campaign's Keeper (specs/scenario-preparation/spec.md).
/// The Keeper check runs first, so anyone else, a missing owner, or an owner of another Scenario or Campaign ends as NotFound
/// before any owner is read (ADR 0013, ADR 0016). The owner decides every change (ADR 0019, ADR 0020, ADR 0022).
/// </summary>
public class HandoutService
{
    private readonly HandoutOwnerLocator _owners;
    private readonly IHandoutFileStore _fileStore;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<HandoutService> _logger;

    public HandoutService(HandoutOwnerLocator owners, IHandoutFileStore fileStore, TimeProvider timeProvider, ILogger<HandoutService> logger)
    {
        _owners = owners;
        _fileStore = fileStore;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    /// <summary>The Handout with its content, or null when the caller is not the Keeper or nothing matches.</summary>
    public async Task<HandoutView?> GetAsync(Guid campaignId, Guid callerAccountId, HandoutOwnerReference ownerReference, Guid handoutId, CancellationToken cancellationToken)
    {
        var owner = await _owners.FindAsync(campaignId, callerAccountId, ownerReference, cancellationToken);
        var handout = owner?.Handouts.FirstOrDefault(candidate => candidate.Id == handoutId);
        return handout is null ? null : ToView(handout);
    }

    /// <summary>Adds a Handout after the owner's others.</summary>
    public async Task<HandoutWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        HandoutOwnerReference ownerReference,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        string? content,
        CancellationToken cancellationToken)
    {
        var owner = await _owners.FindAsync(campaignId, callerAccountId, ownerReference, cancellationToken);
        return owner is null
            ? Refused(HandoutWriteOutcome.NotFound)
            : await SaveAsync(owner, owner.AddHandout(kind, visibility, title, content, _timeProvider.GetUtcNow()), cancellationToken);
    }

    /// <summary>Replaces a Handout's kind, visibility, title, and content; its place in the order is unchanged.</summary>
    public async Task<HandoutWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        HandoutOwnerReference ownerReference,
        Guid handoutId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        string? content,
        CancellationToken cancellationToken)
    {
        var owner = await _owners.FindAsync(campaignId, callerAccountId, ownerReference, cancellationToken);
        return owner is null
            ? Refused(HandoutWriteOutcome.NotFound)
            : await SaveAsync(owner, owner.EditHandout(handoutId, kind, visibility, title, content), cancellationToken);
    }

    /// <summary>Removes a Handout; only a Prepared Scene's Handouts, and an Item's Handouts while it is not in play, can be removed.</summary>
    public async Task<HandoutRemoveOutcome> RemoveAsync(Guid campaignId, Guid callerAccountId, HandoutOwnerReference ownerReference, Guid handoutId, CancellationToken cancellationToken)
    {
        var owner = await _owners.FindAsync(campaignId, callerAccountId, ownerReference, cancellationToken);
        if (owner is null)
        {
            return HandoutRemoveOutcome.NotFound;
        }

        var fileKey = owner.Handouts.FirstOrDefault(candidate => candidate.Id == handoutId)?.FileKey;
        var outcome = owner.RemoveHandout(handoutId);
        if (outcome != HandoutRemovalOutcome.Removed)
        {
            return ToRemoveOutcome(outcome);
        }

        await owner.SaveChangesAsync(cancellationToken);
        if (fileKey is not null)
        {
            await _fileStore.TryDeleteAsync(_logger, fileKey);
        }

        return HandoutRemoveOutcome.Removed;
    }

    /// <summary>Renumbers the owner's Handouts to the requested order and returns them in it.</summary>
    public async Task<HandoutReorderResult> ReorderAsync(
        Guid campaignId,
        Guid callerAccountId,
        HandoutOwnerReference ownerReference,
        IReadOnlyList<Guid> handoutIds,
        CancellationToken cancellationToken)
    {
        var owner = await _owners.FindAsync(campaignId, callerAccountId, ownerReference, cancellationToken);
        if (owner is null)
        {
            return new HandoutReorderResult(HandoutReorderOutcome.NotFound, null);
        }

        var outcome = owner.ReorderHandouts(handoutIds);
        if (outcome != HandoutOrderOutcome.Reordered)
        {
            return new HandoutReorderResult(ToReorderOutcome(outcome), null);
        }

        await owner.SaveChangesAsync(cancellationToken);
        return new HandoutReorderResult(HandoutReorderOutcome.Reordered, owner.Handouts.Select(HandoutViews.ToSummary).ToList());
    }

    private static async Task<HandoutWriteResult> SaveAsync(IHandoutOwner owner, HandoutResult result, CancellationToken cancellationToken)
    {
        if (result.Handout is null)
        {
            return Refused(HandoutWriteOutcomes.From(result.Outcome));
        }

        await owner.SaveChangesAsync(cancellationToken);
        return new HandoutWriteResult(HandoutWriteOutcome.Saved, ToView(result.Handout));
    }

    private static HandoutWriteResult Refused(HandoutWriteOutcome outcome) => new(outcome, null);

    private static HandoutView ToView(Handout handout) => HandoutViews.ToView(handout);

    private static HandoutRemoveOutcome ToRemoveOutcome(HandoutRemovalOutcome outcome) => outcome switch
    {
        HandoutRemovalOutcome.SceneNotPrepared => HandoutRemoveOutcome.NotPrepared,
        HandoutRemovalOutcome.ItemInPlay => HandoutRemoveOutcome.InPlay,
        _ => HandoutRemoveOutcome.NotFound,
    };

    private static HandoutReorderOutcome ToReorderOutcome(HandoutOrderOutcome outcome) => outcome switch
    {
        HandoutOrderOutcome.SceneFinished => HandoutReorderOutcome.Finished,
        HandoutOrderOutcome.DuplicateIds => HandoutReorderOutcome.DuplicateIds,
        _ => HandoutReorderOutcome.DoesNotMatchHandouts,
    };
}
