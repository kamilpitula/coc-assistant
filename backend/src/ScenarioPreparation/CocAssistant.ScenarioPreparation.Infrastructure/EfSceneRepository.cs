namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfSceneRepository : ISceneRepository
{
    // SQL Server names the violated index; SQLite names the constrained columns.
    private static readonly string[] ItemLinkViolationMarkers =
    [
        "IX_ItemLinks_SceneId_ItemId",
        "ItemLinks.SceneId, ItemLinks.ItemId",
    ];

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

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsItemLinkViolation(exception))
        {
            // The rejected link would otherwise stay tracked and be seen again when the caller re-reads the Scene.
            _dbContext.ChangeTracker.Clear();
            throw new ItemLinkConflictException(exception);
        }
    }

    private static bool IsItemLinkViolation(DbUpdateException exception)
    {
        var message = exception.InnerException?.Message ?? string.Empty;
        return ItemLinkViolationMarkers.Any(marker => message.Contains(marker, StringComparison.Ordinal));
    }

    // The only place Scenes are sorted (ADR 0014).
    private IQueryable<Scene> InPreparedOrder(Guid campaignId, Guid scenarioId) =>
        _dbContext.Scenes
            .Where(scene => scene.CampaignId == campaignId && scene.ScenarioId == scenarioId)
            .OrderBy(scene => scene.Position)
            .ThenBy(scene => scene.CreatedAt)
            .ThenBy(scene => scene.Id);
}
