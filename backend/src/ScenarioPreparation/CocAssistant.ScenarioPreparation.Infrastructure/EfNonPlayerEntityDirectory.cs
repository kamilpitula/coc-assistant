namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Reads the Campaign's Non-Player Entity list as one projection per table (D6 of PBI-SP-003). A later table adds its
/// own projection to the same query. Profiles are never read.
/// </summary>
public class EfNonPlayerEntityDirectory : INonPlayerEntityDirectory
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfNonPlayerEntityDirectory(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NonPlayerEntitySummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        await _dbContext.HumanNpcs
            .AsNoTracking()
            .Where(humanNpc => humanNpc.CampaignId == campaignId)
            .OrderBy(humanNpc => humanNpc.Name)
            .ThenBy(humanNpc => humanNpc.Id)
            .Select(humanNpc => new NonPlayerEntitySummary(humanNpc.Id, NonPlayerEntityType.HumanNpc, humanNpc.Name))
            .ToListAsync(cancellationToken);
}
