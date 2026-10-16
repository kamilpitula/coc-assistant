namespace CocAssistant.CampaignPlay.Infrastructure;

public class EfWallEntryRepository : IWallEntryRepository
{
    private readonly CampaignPlayDbContext _dbContext;

    public EfWallEntryRepository(CampaignPlayDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(WallEntry entry) => _dbContext.WallEntries.Add(entry);

    public void Remove(WallEntry entry) => _dbContext.WallEntries.Remove(entry);

    public Task<WallEntry?> FindByIdAsync(Guid campaignId, Guid entryId, CancellationToken cancellationToken) =>
        _dbContext.WallEntries.SingleOrDefaultAsync(
            entry => entry.CampaignId == campaignId && entry.Id == entryId,
            cancellationToken);

    public async Task<IReadOnlyList<WallEntry>> ListAsync(
        Guid campaignId,
        bool includeKeeperOnly,
        WallEntryCursor? after,
        int take,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.WallEntries.Where(entry => entry.CampaignId == campaignId);
        if (!includeKeeperOnly)
        {
            query = query.Where(entry => entry.Visibility == WallEntryVisibility.Public);
        }

        if (after is not null)
        {
            var afterId = after.Id;
            query = query.Where(entry =>
                entry.CreatedAt < after.CreatedAt || (entry.CreatedAt == after.CreatedAt && entry.Id.CompareTo(afterId) < 0));
        }

        return await query
            .OrderByDescending(entry => entry.CreatedAt)
            .ThenByDescending(entry => entry.Id)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);
}
