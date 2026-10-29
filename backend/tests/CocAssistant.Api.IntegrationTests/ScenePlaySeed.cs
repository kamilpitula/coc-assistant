namespace CocAssistant.Api.IntegrationTests;

/// <summary>
/// Plays a stored Scene through the domain transitions for tests that need an Active or Finished Scene as a precondition. It finishes
/// any other Active Scene of the Campaign first, so no test leaves two Active Scenes in one Campaign (ADR 0025).
/// </summary>
public static class ScenePlaySeed
{
    public static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");

    public static SceneTransitionOutcome StartWithOneInvestigator(this Scene scene, DateTimeOffset now) =>
        scene.Start(now, [Harvey], [Harvey]);

    public static async Task PlayAsync(ScenarioPreparationDbContext dbContext, Guid sceneId, SceneStatus status)
    {
        var scene = await dbContext.Scenes.SingleAsync(candidate => candidate.Id == sceneId);
        var others = await dbContext.Scenes
            .Where(candidate => candidate.CampaignId == scene.CampaignId && candidate.Id != sceneId && candidate.Status == SceneStatus.Active)
            .ToListAsync();
        foreach (var other in others)
        {
            other.Finish(DateTimeOffset.UtcNow);
        }

        await dbContext.SaveChangesAsync();

        scene.StartWithOneInvestigator(DateTimeOffset.UtcNow);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(DateTimeOffset.UtcNow.AddMinutes(30));
        }

        await dbContext.SaveChangesAsync();
    }
}
