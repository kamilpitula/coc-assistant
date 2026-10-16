namespace CocAssistant.CampaignPlay.Application;

/// <summary>Application port for Wall Entry persistence, implemented by Infrastructure. Every lookup is scoped to a Campaign.</summary>
public interface IWallEntryRepository
{
    void Add(WallEntry entry);

    void Remove(WallEntry entry);

    Task<WallEntry?> FindByIdAsync(Guid campaignId, Guid entryId, CancellationToken cancellationToken);

    /// <summary>
    /// The Campaign's entries newest first, after the cursor, at most <paramref name="take"/>. Keeper-only entries are
    /// excluded before ordering and paging unless <paramref name="includeKeeperOnly"/> is set.
    /// </summary>
    Task<IReadOnlyList<WallEntry>> ListAsync(
        Guid campaignId,
        bool includeKeeperOnly,
        WallEntryCursor? after,
        int take,
        CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
