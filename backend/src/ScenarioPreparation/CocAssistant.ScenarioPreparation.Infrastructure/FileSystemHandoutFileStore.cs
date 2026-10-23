namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Stores Handout files as one file per key under a local directory; the Azure-free adapter for development, tests, and E2E
/// (PBI-SP-007 D7). Keys are the 32 hexadecimal characters the application generates; anything else is rejected, so a key can
/// never leave the directory. A key is written once: saving it again fails.
/// </summary>
public sealed partial class FileSystemHandoutFileStore : IHandoutFileStore
{
    private readonly string _directory;

    public FileSystemHandoutFileStore(string directory) => _directory = directory;

    public async Task SaveAsync(string key, Stream content, string mediaType, CancellationToken cancellationToken)
    {
        var path = PathFor(key);
        try
        {
            Directory.CreateDirectory(_directory);
            await using var file = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            try
            {
                await content.CopyToAsync(file, cancellationToken);
            }
            catch
            {
                file.Close();
                File.Delete(path);
                throw;
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw new HandoutFileStoreException("The Handout file could not be written.", exception);
        }
    }

    public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        var path = PathFor(key);
        try
        {
            return Task.FromResult<Stream>(new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous));
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw new HandoutFileStoreException("The Handout file could not be read.", exception);
        }
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        var path = PathFor(key);
        try
        {
            File.Delete(path);
            return Task.CompletedTask;
        }
        catch (DirectoryNotFoundException)
        {
            return Task.CompletedTask;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            throw new HandoutFileStoreException("The Handout file could not be deleted.", exception);
        }
    }

    private string PathFor(string key) =>
        KeyPattern().IsMatch(key)
            ? Path.Combine(_directory, key)
            : throw new HandoutFileStoreException("A Handout file key is 32 lowercase hexadecimal characters.");

    [GeneratedRegex("^[0-9a-f]{32}$")]
    private static partial Regex KeyPattern();
}
