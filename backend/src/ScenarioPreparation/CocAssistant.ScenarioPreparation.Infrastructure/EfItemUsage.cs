namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Answers whether an Item is in play (ADR 0022, ADR 0029): a link on an Active or Finished Scene of its Campaign, or a Reveal
/// of the Item or of one of its Handouts. Prepared Scenes do not count as played: their links go with the Item. Who holds the
/// Item is stored on the Item itself and OR-ed in by callers.
/// </summary>
public class EfItemUsage : IItemUsage
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfItemUsage(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> IsPlayedAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        if (await _dbContext.ItemLinks
            .AsNoTracking()
            .Where(link => link.ItemId == itemId)
            .AnyAsync(
                link => _dbContext.Scenes.Any(scene => scene.Id == link.SceneId && scene.CampaignId == campaignId && scene.Status != SceneStatus.Prepared),
                cancellationToken))
        {
            return true;
        }

        var handoutIds = _dbContext.Set<Handout>().Where(handout => handout.ItemId == itemId).Select(handout => handout.Id);
        return await _dbContext.Set<Reveal>()
            .AsNoTracking()
            .Where(reveal => _dbContext.Scenes.Any(scene => scene.Id == reveal.SceneId && scene.CampaignId == campaignId))
            .AnyAsync(
                reveal => (reveal.SubjectType == RevealSubjectType.Item && reveal.SubjectId == itemId)
                    || (reveal.SubjectType == RevealSubjectType.Handout && handoutIds.Contains(reveal.SubjectId)),
                cancellationToken);
    }

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
