namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>An in-memory <see cref="IHandoutFileStore"/> that records each call and can be told to fail.</summary>
public sealed class FakeHandoutFileStore : IHandoutFileStore
{
    private readonly Dictionary<string, (byte[] Bytes, string MediaType)> _blobs = [];

    public List<string> SavedKeys { get; } = [];

    public List<string> DeletedKeys { get; } = [];

    public List<string> OpenedKeys { get; } = [];

    public bool FailSave { get; set; }

    public bool FailDelete { get; set; }

    public IReadOnlyCollection<string> StoredKeys => _blobs.Keys;

    public int CallCount => SavedKeys.Count + DeletedKeys.Count + OpenedKeys.Count;

    public byte[] BytesOf(string key) => _blobs[key].Bytes;

    public string MediaTypeOf(string key) => _blobs[key].MediaType;

    /// <summary>Puts a blob in the store as if an earlier request had saved it.</summary>
    public void Seed(string key, byte[] bytes, string mediaType) => _blobs[key] = (bytes, mediaType);

    public async Task SaveAsync(string key, Stream content, string mediaType, CancellationToken cancellationToken)
    {
        SavedKeys.Add(key);
        if (FailSave)
        {
            throw new HandoutFileStoreException("The store is down.");
        }

        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, cancellationToken);
        _blobs[key] = (copy.ToArray(), mediaType);
    }

    public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        OpenedKeys.Add(key);
        return _blobs.TryGetValue(key, out var blob)
            ? Task.FromResult<Stream>(new MemoryStream(blob.Bytes))
            : throw new HandoutFileStoreException("No such blob.");
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        DeletedKeys.Add(key);
        if (FailDelete)
        {
            throw new HandoutFileStoreException("The store is down.");
        }

        _blobs.Remove(key);
        return Task.CompletedTask;
    }
}
