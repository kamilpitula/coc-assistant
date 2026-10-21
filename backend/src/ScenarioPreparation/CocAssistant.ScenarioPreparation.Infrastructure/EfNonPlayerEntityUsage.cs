namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Answers whether a Non-Player Entity has a link on an Active or Finished Scene of its Campaign, as one existence query over
/// the link table (ADR 0019). Prepared Scenes do not count: their links go with the profile.
/// </summary>
public class EfNonPlayerEntityUsage : INonPlayerEntityUsage
{
    private readonly ScenarioPreparationDbContext _dbContext;

    public EfNonPlayerEntityUsage(ScenarioPreparationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken)
    {
        var links = _dbContext.NonPlayerEntityLinks.AsNoTracking();
        links = type == NonPlayerEntityType.HumanNpc
            ? links.Where(link => EF.Property<Guid?>(link, "HumanNpcId") == nonPlayerEntityId)
            : links.Where(link => EF.Property<Guid?>(link, "MythosCreatureId") == nonPlayerEntityId);

        return links.AnyAsync(
            link => _dbContext.Scenes.Any(scene => scene.Id == link.SceneId && scene.CampaignId == campaignId && scene.Status != SceneStatus.Prepared),
            cancellationToken);
    }
}
