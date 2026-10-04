namespace CocAssistant.CampaignPlay.Infrastructure;

public class EfCampaignRepository : ICampaignRepository
{
    // SQL Server names the violated index; SQLite names the constrained column.
    private static readonly string[] ActiveInviteViolationMarkers =
    [
        CampaignPlayDbContext.ActiveInviteIndexName,
        "CampaignInvite.CampaignId",
    ];

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

    public async Task<IReadOnlyList<Campaign>> ListForMemberAsync(Guid accountId, CancellationToken cancellationToken) =>
        await _dbContext.Campaigns
            .Include(campaign => campaign.Invites)
            .Include(campaign => campaign.Players)
            .Where(campaign => campaign.KeeperAccountId == accountId || campaign.Players.Any(player => player.AccountId == accountId))
            .ToListAsync(cancellationToken);

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
        catch (DbUpdateException exception) when (IsActiveInviteViolation(exception))
        {
            throw new CampaignMembershipConflictException(exception);
        }
    }

    private static bool IsActiveInviteViolation(DbUpdateException exception)
    {
        var message = exception.InnerException?.Message ?? string.Empty;
        return ActiveInviteViolationMarkers.Any(marker => message.Contains(marker, StringComparison.Ordinal));
    }
}
