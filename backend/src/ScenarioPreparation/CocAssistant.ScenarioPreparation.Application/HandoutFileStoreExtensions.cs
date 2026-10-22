namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Best-effort blob cleanup after a commit or a failed commit (PBI-SP-007 D5): a failure is logged with the key, never thrown.</summary>
internal static partial class HandoutFileStoreExtensions
{
    public static async Task TryDeleteAsync(this IHandoutFileStore store, ILogger logger, string key)
    {
        try
        {
            await store.DeleteAsync(key, CancellationToken.None);
        }
        catch (HandoutFileStoreException exception)
        {
            LogOrphanedBlob(logger, key, exception);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Could not delete Handout file blob {Key}; it is orphaned until a sweep removes it.")]
    private static partial void LogOrphanedBlob(ILogger logger, string key, Exception exception);
}
