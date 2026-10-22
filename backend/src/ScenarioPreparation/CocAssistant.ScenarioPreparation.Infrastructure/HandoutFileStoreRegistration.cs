namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Chooses the Handout file adapter from configuration (PBI-SP-007 D7; the shape of the live transport registration in the Api):
/// Azure Blob Storage when Azure:Storage:ConnectionString is set, otherwise a local directory at HandoutFiles:LocalDirectory.
/// With neither, resolving the store fails in every environment, so files are never written to an unplanned place.
/// </summary>
public static class HandoutFileStoreRegistration
{
    public const string AzureStorageConnectionStringKey = "Azure:Storage:ConnectionString";

    public const string LocalDirectoryKey = "HandoutFiles:LocalDirectory";

    public static IHandoutFileStore Create(IConfiguration configuration)
    {
        var connectionString = configuration[AzureStorageConnectionStringKey];
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return new AzureBlobHandoutFileStore(connectionString);
        }

        var directory = configuration[LocalDirectoryKey];
        return string.IsNullOrWhiteSpace(directory)
            ? throw new InvalidOperationException($"Handout files need storage: set {AzureStorageConnectionStringKey} or {LocalDirectoryKey}.")
            : new FileSystemHandoutFileStore(directory);
    }
}
