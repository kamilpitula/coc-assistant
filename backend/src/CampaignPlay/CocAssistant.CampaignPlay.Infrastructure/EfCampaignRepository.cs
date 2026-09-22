namespace CocAssistant.CampaignPlay.Infrastructure;

public class EfCampaignRepository : ICampaignRepository
{
    private readonly CampaignPlayDbContext _dbContext;

    public EfCampaignRepository(CampaignPlayDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Campaign campaign) => _dbContext.Campaigns.Add(campaign);

    public Task<Campaign?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _dbContext.Campaigns.SingleOrDefaultAsync(campaign => campaign.Id == id, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);
}
