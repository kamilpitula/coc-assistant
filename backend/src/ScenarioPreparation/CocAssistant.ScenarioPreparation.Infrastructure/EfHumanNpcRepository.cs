namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfHumanNpcRepository : IHumanNpcRepository
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfHumanNpcRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(HumanNpc humanNpc) => _dbContext.HumanNpcs.Add(humanNpc);

    public void Remove(HumanNpc humanNpc) => _dbContext.HumanNpcs.Remove(humanNpc);

    public Task<HumanNpc?> FindByIdAsync(Guid campaignId, Guid humanNpcId, CancellationToken cancellationToken) =>
        _dbContext.HumanNpcs.SingleOrDefaultAsync(
            humanNpc => humanNpc.CampaignId == campaignId && humanNpc.Id == humanNpcId,
            cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);
}
