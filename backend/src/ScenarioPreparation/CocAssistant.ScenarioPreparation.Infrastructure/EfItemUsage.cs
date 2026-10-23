namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Answers whether an Item has a link on an Active or Finished Scene of its Campaign, and which Scenes link it, as queries over
/// the link table (ADR 0022). Prepared Scenes do not count as played: their links go with the Item.
/// </summary>
public class EfItemUsage : IItemUsage
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfItemUsage(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken) =>
        _dbContext.ItemLinks
            .AsNoTracking()
            .Where(link => link.ItemId == itemId)
            .AnyAsync(
                link => _dbContext.Scenes.Any(scene => scene.Id == link.SceneId && scene.CampaignId == campaignId && scene.Status != SceneStatus.Prepared),
                cancellationToken);

    public async Task<IReadOnlyList<ItemScene>> ListLinkedScenesAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.ItemLinks
            .AsNoTracking()
            .Where(link => link.ItemId == itemId)
            .Join(_dbContext.Scenes.Where(scene => scene.CampaignId == campaignId), link => link.SceneId, scene => scene.Id, (link, scene) => scene)
            .Join(_dbContext.Scenarios, scene => scene.ScenarioId, scenario => scenario.Id, (scene, scenario) => new { scene, scenario })
            .OrderBy(row => row.scenario.Position)
            .ThenBy(row => row.scenario.CreatedAt)
            .ThenBy(row => row.scenario.Id)
            .ThenBy(row => row.scene.Position)
            .ThenBy(row => row.scene.CreatedAt)
            .ThenBy(row => row.scene.Id)
            .Select(row => new { row.scenario.Id, ScenarioTitle = row.scenario.Title, SceneId = row.scene.Id, SceneTitle = row.scene.Title, row.scene.Status })
            .ToListAsync(cancellationToken);
        return rows.Select(row => new ItemScene(row.Id, row.ScenarioTitle, row.SceneId, row.SceneTitle, row.Status)).ToList();
    }
}
