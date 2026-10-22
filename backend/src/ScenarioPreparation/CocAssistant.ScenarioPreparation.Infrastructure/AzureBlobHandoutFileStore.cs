namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Stores Handout files as blobs in the private "handout-files" container of an Azure Storage account (PBI-SP-007 D1, D7;
/// ADR 0021). The container is created lazily on first use, a blob is never overwritten, and every storage failure,
/// including a missing blob, is a <see cref="HandoutFileStoreException"/>.
/// </summary>
public sealed class AzureBlobHandoutFileStore : IHandoutFileStore
{
    public const string ContainerName = "handout-files";

    private readonly BlobContainerClient _container;
    private readonly SemaphoreSlim _containerCreation = new(1, 1);
    private bool _containerExists;

    public AzureBlobHandoutFileStore(string connectionString) => _container = new BlobContainerClient(connectionString, ContainerName);

    public async Task SaveAsync(string key, Stream content, string mediaType, CancellationToken cancellationToken)
    {
        try
        {
            await EnsureContainerAsync(cancellationToken);
            var options = new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = mediaType },
                Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All },
            };
            await _container.GetBlobClient(key).UploadAsync(content, options, cancellationToken);
        }
        catch (RequestFailedException exception)
        {
            throw new HandoutFileStoreException("The Handout file could not be written.", exception);
        }
    }

    public async Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            return await _container.GetBlobClient(key).OpenReadAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException exception)
        {
            throw new HandoutFileStoreException("The Handout file could not be read.", exception);
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            await _container.GetBlobClient(key).DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
        catch (RequestFailedException exception)
        {
            throw new HandoutFileStoreException("The Handout file could not be deleted.", exception);
        }
    }

    private async Task EnsureContainerAsync(CancellationToken cancellationToken)
    {
        if (_containerExists)
        {
            return;
        }

        await _containerCreation.WaitAsync(cancellationToken);
        try
        {
            await _container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: cancellationToken);
            _containerExists = true;
        }
        finally
        {
            _containerCreation.Release();
        }
    }
}
