namespace CocAssistant.ScenarioPreparation.Infrastructure;

public class EfSceneRepository : ISceneRepository
{
    private const string InvestigatorsPresentNavigation = "_investigatorsPresent";
    private const string RevealsNavigation = "_reveals";
    private const string RevealRecipientsNavigation = "_reveals._recipients";

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
        WithChildren().SingleOrDefaultAsync(
            scene => scene.CampaignId == campaignId && scene.ScenarioId == scenarioId && scene.Id == sceneId,
            cancellationToken);

    public Task<Scene?> FindForPlayAsync(Guid campaignId, Guid sceneId, CancellationToken cancellationToken) =>
        WithChildren().SingleOrDefaultAsync(scene => scene.CampaignId == campaignId && scene.Id == sceneId, cancellationToken);

    public Task<Scene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken) =>
        WithChildren().SingleOrDefaultAsync(scene => scene.CampaignId == campaignId && scene.Status == SceneStatus.Active, cancellationToken);

    public async Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingNonPlayerEntityAsync(
        Guid campaignId,
        NonPlayerEntityType type,
        Guid nonPlayerEntityId,
        CancellationToken cancellationToken)
    {
        var links = _dbContext.NonPlayerEntityLinks.AsQueryable();
        links = type == NonPlayerEntityType.HumanNpc
            ? links.Where(link => EF.Property<Guid?>(link, "HumanNpcId") == nonPlayerEntityId)
            : links.Where(link => EF.Property<Guid?>(link, "MythosCreatureId") == nonPlayerEntityId);
        var sceneIds = links.Select(link => link.SceneId);
        return await PreparedScenes(campaignId).Where(scene => sceneIds.Contains(scene.Id)).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Scene>> ListTrackedPreparedLinkingItemAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var sceneIds = _dbContext.ItemLinks.Where(link => link.ItemId == itemId).Select(link => link.SceneId);
        return await PreparedScenes(campaignId).Where(scene => sceneIds.Contains(scene.Id)).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SceneReveal>> ListRevealsForInvestigatorAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var revealIds = _dbContext.Set<RevealRecipient>().Where(recipient => recipient.InvestigatorId == investigatorId).Select(recipient => recipient.RevealId);
        var rows = await _dbContext.Set<Reveal>()
            .AsNoTracking()
            .Join(_dbContext.Scenes.Where(scene => scene.CampaignId == campaignId), reveal => reveal.SceneId, scene => scene.Id, (reveal, scene) => new { reveal, scene.Title })
            .Where(row => revealIds.Contains(row.reveal.Id))
            .OrderByDescending(row => row.reveal.RevealedAt)
            .ThenBy(row => row.reveal.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new SceneReveal(row.reveal, row.reveal.SceneId, row.Title)).ToList();
    }

    public Task<Reveal?> FindRevealAsync(Guid campaignId, Guid revealId, CancellationToken cancellationToken) =>
        _dbContext.Set<Reveal>()
            .AsNoTracking()
            .Include("_recipients")
            .Where(reveal => reveal.Id == revealId && _dbContext.Scenes.Any(scene => scene.Id == reveal.SceneId && scene.CampaignId == campaignId))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<int> MaxPositionAsync(Guid scenarioId, CancellationToken cancellationToken) =>
        await _dbContext.Scenes
            .Where(scene => scene.ScenarioId == scenarioId)
            .MaxAsync(scene => (int?)scene.Position, cancellationToken) ?? 0;

    public Task SaveChangesAsync(CancellationToken cancellationToken) => SceneSaveChanges.SaveAsync(_dbContext, cancellationToken);

    // The only transaction in the codebase (ADR 0025). Disposing it without a commit rolls both saves back.
    public Task SaveFinishThenStartAsync(Func<SceneTransitionOutcome> startScene, CancellationToken cancellationToken) =>
        SceneSaveChanges.ExecuteAsync(
            _dbContext,
            async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
                if (startScene() != SceneTransitionOutcome.Transitioned)
                {
                    throw new InvalidOperationException("The Scene was checked before the finish and must start.");
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });

    private IQueryable<Scene> WithChildren() =>
        _dbContext.Scenes
            .Include(scene => scene.NonPlayerEntityLinks)
            .Include(scene => scene.ItemLinks)
            .Include(scene => scene.Handouts)
            .Include(InvestigatorsPresentNavigation)
            .Include(RevealRecipientsNavigation);

    private IQueryable<Scene> PreparedScenes(Guid campaignId) =>
        _dbContext.Scenes.Where(scene => scene.CampaignId == campaignId && scene.Status == SceneStatus.Prepared);

    // The only place Scenes are sorted (ADR 0014).
    private IQueryable<Scene> InPreparedOrder(Guid campaignId, Guid scenarioId) =>
        _dbContext.Scenes
            .Where(scene => scene.CampaignId == campaignId && scene.ScenarioId == scenarioId)
            .OrderBy(scene => scene.Position)
            .ThenBy(scene => scene.CreatedAt)
            .ThenBy(scene => scene.Id);
}
