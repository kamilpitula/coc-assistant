namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfMythosCreatureRepository : IMythosCreatureRepository
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfMythosCreatureRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(MythosCreature mythosCreature) => _dbContext.MythosCreatures.Add(mythosCreature);

    public void Remove(MythosCreature mythosCreature) => _dbContext.MythosCreatures.Remove(mythosCreature);

    public Task<MythosCreature?> FindByIdAsync(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken) =>
        _dbContext.MythosCreatures.SingleOrDefaultAsync(
            mythosCreature => mythosCreature.CampaignId == campaignId && mythosCreature.Id == mythosCreatureId,
            cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => SceneSaveChanges.SaveAsync(_dbContext, cancellationToken);
}
