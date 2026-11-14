namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for Roll Request persistence, implemented by Infrastructure. Every lookup filters Campaign and Roll
/// Request ids together, so a request of another Campaign is simply not found (ADR 0013, ADR 0032).
/// </summary>
public interface ISceneRollRequestRepository
{
    void Add(RollRequest request);

    /// <summary>A Roll Request of the Campaign with its Requested Rolls, change-tracked; null when there is none.</summary>
    Task<RollRequest?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken);

    /// <summary>
    /// The Scene's Roll Requests with their Requested Rolls, oldest first (CreatedAt, then Id), read-only and without
    /// Campaign filtering beyond the Scene's own (ADR 0014).
    /// </summary>
    Task<IReadOnlyList<RollRequest>> ListForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken);

    /// <summary>
    /// The Scene's Roll Requests with their Requested Rolls, oldest first (CreatedAt, then Id), change-tracked for a
    /// write that shares the Scene's save (ADR 0032). It carries no status filter.
    /// </summary>
    Task<IReadOnlyList<RollRequest>> ListTrackedForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken);

    /// <summary>
    /// Saves the changes. Throws <see cref="RollRequestConcurrencyException"/> when a Requested Roll's version changed
    /// since it was read.
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
