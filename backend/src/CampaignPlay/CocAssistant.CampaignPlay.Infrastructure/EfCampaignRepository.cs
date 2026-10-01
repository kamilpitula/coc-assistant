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
        _dbContext.Campaigns
            .Include(campaign => campaign.Invites)
            .Include(campaign => campaign.Players)
            .SingleOrDefaultAsync(campaign => campaign.Id == id, cancellationToken);

    public Task<Campaign?> FindByInviteTokenAsync(string token, CancellationToken cancellationToken) =>
        _dbContext.Campaigns
            .Include(campaign => campaign.Invites)
            .Include(campaign => campaign.Players)
            .SingleOrDefaultAsync(campaign => campaign.Invites.Any(invite => invite.Token == token), cancellationToken);

    public void DiscardPendingChanges() => _dbContext.ChangeTracker.Clear();

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new CampaignMembershipConflictException(exception);
        }
    }
}
