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

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);
}
