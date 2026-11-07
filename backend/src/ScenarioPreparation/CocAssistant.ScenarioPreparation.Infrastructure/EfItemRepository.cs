namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfItemRepository : IItemRepository
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfItemRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Item item) => _dbContext.Items.Add(item);

    public void Remove(Item item) => _dbContext.Items.Remove(item);

    public Task<Item?> FindByIdAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken) =>
        _dbContext.Items.Include(item => item.Handouts).SingleOrDefaultAsync(
            item => item.CampaignId == campaignId && item.Id == itemId,
            cancellationToken);

    public async Task<IReadOnlyList<Item>> ListLinkedForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken)
    {
        var linkedIds = await _dbContext.ItemLinks
            .Where(link => link.SceneId == sceneId)
            .OrderBy(link => link.CreatedAt)
            .ThenBy(link => link.Id)
            .Select(link => link.ItemId)
            .ToListAsync(cancellationToken);
        if (linkedIds.Count == 0)
        {
            return [];
        }

        var byId = await _dbContext.Items
            .Include(item => item.Handouts)
            .Where(item => item.CampaignId == campaignId && linkedIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        return linkedIds.Where(byId.ContainsKey).Select(id => byId[id]).ToList();
    }

    public async Task<IReadOnlyList<HeldItem>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.Items
            .AsNoTracking()
            .Where(item => item.CampaignId == campaignId && item.HolderInvestigatorId == investigatorId && item.HolderRevealId != null)
            .Join(
                _dbContext.Set<Reveal>().AsNoTracking(),
                item => item.HolderRevealId!.Value,
                reveal => reveal.Id,
                (item, reveal) => new { Item = item, Reveal = reveal })
            .OrderByDescending(row => row.Reveal.RevealedAt)
            .ThenBy(row => row.Reveal.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new HeldItem(row.Item, row.Reveal)).ToList();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) => SceneSaveChanges.SaveAsync(_dbContext, cancellationToken);
}
