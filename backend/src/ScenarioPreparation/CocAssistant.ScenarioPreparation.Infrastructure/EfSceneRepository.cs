namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfSceneRepository : ISceneRepository
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfSceneRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Scene scene) => _dbContext.Scenes.Add(scene);

    public void Remove(Scene scene) => _dbContext.Scenes.Remove(scene);

    public async Task<IReadOnlyList<Scene>> ListForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken) =>
        await InPreparedOrder(campaignId, scenarioId).AsNoTracking().ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Scene>> ListTrackedForScenarioAsync(Guid campaignId, Guid scenarioId, CancellationToken cancellationToken) =>
        await InPreparedOrder(campaignId, scenarioId).ToListAsync(cancellationToken);

    public Task<Scene?> FindByIdAsync(Guid campaignId, Guid scenarioId, Guid sceneId, CancellationToken cancellationToken) =>
        _dbContext.Scenes.Include(scene => scene.NonPlayerEntityLinks).Include(scene => scene.ItemLinks).Include(scene => scene.Handouts).SingleOrDefaultAsync(
            scene => scene.CampaignId == campaignId && scene.ScenarioId == scenarioId && scene.Id == sceneId,
            cancellationToken);

    public async Task<int> MaxPositionAsync(Guid scenarioId, CancellationToken cancellationToken) =>
        await _dbContext.Scenes
            .Where(scene => scene.ScenarioId == scenarioId)
            .MaxAsync(scene => (int?)scene.Position, cancellationToken) ?? 0;

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _dbContext.SaveChangesAsync(cancellationToken);

    // The only place Scenes are sorted (ADR 0014).
    private IQueryable<Scene> InPreparedOrder(Guid campaignId, Guid scenarioId) =>
        _dbContext.Scenes
            .Where(scene => scene.CampaignId == campaignId && scene.ScenarioId == scenarioId)
            .OrderBy(scene => scene.Position)
            .ThenBy(scene => scene.CreatedAt)
            .ThenBy(scene => scene.Id);
}
