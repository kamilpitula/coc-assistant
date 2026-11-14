namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfSceneRollRequestRepository : ISceneRollRequestRepository
{
    private const string RequestedRollsNavigation = "_requestedRolls";

    private readonly ScenarioPreparationDbContext _dbContext;

    public EfSceneRollRequestRepository(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(RollRequest request) => _dbContext.Set<RollRequest>().Add(request);

    public Task<RollRequest?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken) =>
        WithRolls().SingleOrDefaultAsync(
            request => request.CampaignId == campaignId && request.Id == requestId,
            cancellationToken);

    public async Task<IReadOnlyList<RollRequest>> ListForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken) =>
        await _dbContext.Set<RollRequest>()
            .AsNoTracking()
            .Include(RequestedRollsNavigation)
            .Where(request => request.CampaignId == campaignId && request.SceneId == sceneId)
            .OrderBy(request => request.CreatedAt)
            .ThenBy(request => request.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RollRequest>> ListTrackedForSceneAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken) =>
        await WithRolls()
            .Where(request => request.CampaignId == campaignId && request.SceneId == sceneId)
            .OrderBy(request => request.CreatedAt)
            .ThenBy(request => request.Id)
            .ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        RollRequestSaveChanges.SaveAsync(_dbContext, cancellationToken);

    private IQueryable<RollRequest> WithRolls() =>
        _dbContext.Set<RollRequest>().Include(RequestedRollsNavigation);
}
