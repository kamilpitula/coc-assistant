namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Reads the Campaign's Non-Player Entity list as one projection per table (D6 of PBI-SP-003) joined by Concat, then
/// ordered by name and id in the database. A later table adds its own projection to the same query. Profiles are never
/// read.
/// </summary>
public class EfNonPlayerEntityDirectory : INonPlayerEntityDirectory
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfNonPlayerEntityDirectory(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NonPlayerEntitySummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var humanNpcs = _dbContext.HumanNpcs
            .AsNoTracking()
            .Where(humanNpc => humanNpc.CampaignId == campaignId)
            .Select(humanNpc => new { humanNpc.Id, Type = NonPlayerEntityType.HumanNpc, humanNpc.Name });
        var mythosCreatures = _dbContext.MythosCreatures
            .AsNoTracking()
            .Where(mythosCreature => mythosCreature.CampaignId == campaignId)
            .Select(mythosCreature => new { mythosCreature.Id, Type = NonPlayerEntityType.MythosCreature, mythosCreature.Name });

        var rows = await humanNpcs
            .Concat(mythosCreatures)
            .OrderBy(row => row.Name)
            .ThenBy(row => row.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(row => new NonPlayerEntitySummary(row.Id, row.Type, row.Name)).ToList();
    }
}
