namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Saves the context and turns the races on Scenes into the Application's exceptions, clearing the change tracker so a rejected
/// change is not seen again when the caller re-reads (ADR 0025). Every repository that can write a Scene's row or guard it uses this.
/// </summary>
internal static class SceneSaveChanges
{
    // SQL Server names the violated index; SQLite names the constrained columns.
    private static readonly string[] ItemLinkViolationMarkers =
    [
        "IX_ItemLinks_SceneId_ItemId",
        "ItemLinks.SceneId, ItemLinks.ItemId",
    ];

    private static readonly string[] ActiveSceneViolationMarkers =
    [
        ScenarioPreparationDbContext.ActiveSceneIndexName,
        "Scenes.CampaignId",
    ];

    // A same-Scene race can fail on the present rows' key before the version check (ADR 0025).
    private static readonly string[] PresentRowViolationMarkers =
    [
        "PK_SceneInvestigatorsPresent",
        "SceneInvestigatorsPresent.SceneId, SceneInvestigatorsPresent.InvestigatorId",
    ];

    public static Task SaveAsync(ScenarioPreparationDbContext dbContext, CancellationToken cancellationToken) =>
        ExecuteAsync(dbContext, () => dbContext.SaveChangesAsync(cancellationToken));

    /// <summary>Runs the writes and maps the Scene races to the Application's exceptions, clearing the tracker first.</summary>
    public static async Task ExecuteAsync(ScenarioPreparationDbContext dbContext, Func<Task> write)
    {
        try
        {
            await write();
        }
        catch (DbUpdateConcurrencyException exception)
        {
            dbContext.ChangeTracker.Clear();
            throw new SceneConcurrencyException(exception);
        }
        catch (DbUpdateException exception) when (Violates(exception, PresentRowViolationMarkers))
        {
            dbContext.ChangeTracker.Clear();
            throw new SceneConcurrencyException(exception);
        }
        catch (DbUpdateException exception) when (Violates(exception, ActiveSceneViolationMarkers))
        {
            dbContext.ChangeTracker.Clear();
            throw new ActiveSceneConflictException(exception);
        }
        catch (DbUpdateException exception) when (Violates(exception, ItemLinkViolationMarkers))
        {
            dbContext.ChangeTracker.Clear();
            throw new ItemLinkConflictException(exception);
        }
    }

    private static bool Violates(DbUpdateException exception, string[] markers)
    {
        var message = exception.InnerException?.Message ?? string.Empty;
        return markers.Any(marker => message.Contains(marker, StringComparison.Ordinal));
    }
}
