namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Reads the Campaign's Item list as one projection, ordered by name and id in the database, with the number of Scenes that link
/// each Item (a Scene links an Item at most once). Descriptions, notes, and Handouts are never read.
/// </summary>
public class EfItemDirectory : IItemDirectory
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfItemDirectory(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ItemSummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var rows = await _dbContext.Items
            .AsNoTracking()
            .Where(item => item.CampaignId == campaignId)
            .OrderBy(item => item.Name)
            .ThenBy(item => item.Id)
            .Select(item => new { item.Id, item.Name, SceneCount = _dbContext.ItemLinks.Count(link => link.ItemId == item.Id) })
            .ToListAsync(cancellationToken);
        return rows.Select(row => new ItemSummary(row.Id, row.Name, row.SceneCount)).ToList();
    }
}
