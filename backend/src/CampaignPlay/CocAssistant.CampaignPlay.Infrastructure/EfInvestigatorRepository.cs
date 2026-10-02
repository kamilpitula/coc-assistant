namespace CocAssistant.CampaignPlay.Infrastructure;

public class EfInvestigatorRepository : IInvestigatorRepository
{
    // SQL Server names the violated index; SQLite names the constrained columns.
    private static readonly string[] OneInvestigatorPerPlayerViolationMarkers =
    [
        CampaignPlayDbContext.OneInvestigatorPerPlayerIndexName,
        "Investigators.CampaignId, Investigators.PlayerAccountId",
    ];

    private readonly CampaignPlayDbContext _dbContext;

    public EfInvestigatorRepository(CampaignPlayDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Investigator investigator) => _dbContext.Investigators.Add(investigator);

    public void Remove(Investigator investigator) => _dbContext.Investigators.Remove(investigator);

    public Task<Investigator?> FindByIdAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken) =>
        _dbContext.Investigators.SingleOrDefaultAsync(
            investigator => investigator.CampaignId == campaignId && investigator.Id == investigatorId,
            cancellationToken);

    public Task<Investigator?> FindForPlayerAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken) =>
        _dbContext.Investigators.SingleOrDefaultAsync(
            investigator => investigator.CampaignId == campaignId && investigator.PlayerAccountId == playerAccountId,
            cancellationToken);

    public async Task<IReadOnlyList<Investigator>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        await _dbContext.Investigators
            .Where(investigator => investigator.CampaignId == campaignId)
            .ToListAsync(cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new InvestigatorConflictException(exception);
        }
        catch (DbUpdateException exception) when (IsOneInvestigatorPerPlayerViolation(exception))
        {
            throw new InvestigatorConflictException(exception);
        }
    }

    private static bool IsOneInvestigatorPerPlayerViolation(DbUpdateException exception)
    {
        var message = exception.InnerException?.Message ?? string.Empty;
        return OneInvestigatorPerPlayerViolationMarkers.Any(marker => message.Contains(marker, StringComparison.Ordinal));
    }
}
