namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfScenarioRepository : IScenarioRepository
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfScenarioRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Scenario scenario) => _dbContext.Scenarios.Add(scenario);

    public async Task<IReadOnlyList<Scenario>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        await InCampaignOrder(campaignId).AsNoTracking().ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Scenario>> ListTrackedForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        await InCampaignOrder(campaignId).ToListAsync(cancellationToken);

    public Task<Scenario?> FindByIdAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken) =>
        _dbContext.Scenarios.SingleOrDefaultAsync(
            scenario => scenario.CampaignId == campaignId && scenario.Id == scenarioId,
            cancellationToken);

    public async Task<int> MaxPositionAsync(Guid campaignId, CancellationToken cancellationToken) =>
        await _dbContext.Scenarios
            .Where(scenario => scenario.CampaignId == campaignId)
            .MaxAsync(scenario => (int?)scenario.Position, cancellationToken) ?? 0;

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);

    // The only place Scenarios are sorted (ADR 0014).
    private IQueryable<Scenario> InCampaignOrder(Guid campaignId) =>
        _dbContext.Scenarios
            .Where(scenario => scenario.CampaignId == campaignId)
            .OrderBy(scenario => scenario.Position)
            .ThenBy(scenario => scenario.CreatedAt)
            .ThenBy(scenario => scenario.Id);
}
