namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Saves the Roll Request context and turns a lost race on a Requested Roll's version into the Application's exception,
/// clearing the change tracker so a rejected change is not seen again when the caller re-reads (ADR 0032, ADR 0025).
/// </summary>
internal static class RollRequestSaveChanges
{
    public static Task SaveAsync(ScenarioPreparationDbContext dbContext, CancellationToken cancellationToken) =>
        ExecuteAsync(dbContext, () => dbContext.SaveChangesAsync(cancellationToken));

    public static async Task ExecuteAsync(ScenarioPreparationDbContext dbContext, Func<Task> write)
    {
        try
        {
            await write();
        }
        catch (DbUpdateConcurrencyException exception)
        {
            dbContext.ChangeTracker.Clear();
            throw new RollRequestConcurrencyException(exception);
        }
    }
}
