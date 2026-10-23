namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for the stored files of Image, Document, and Map Handouts, implemented by Infrastructure (ADR 0021).
/// A key is written once and never overwritten. Every adapter wraps each storage failure, including a missing blob,
/// in <see cref="HandoutFileStoreException"/>.
/// </summary>
public interface IHandoutFileStore
{
    Task SaveAsync(string key, Stream content, string mediaType, CancellationToken cancellationToken);

    /// <summary>The stored bytes; the caller disposes the stream. Throws <see cref="HandoutFileStoreException"/> when the key is not stored.</summary>
    Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken);

    /// <summary>Deletes the blob; deleting a key that is not stored is not an error.</summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}

/// <summary>A storage failure of an <see cref="IHandoutFileStore"/>, including a blob that is not there.</summary>
public sealed class HandoutFileStoreException : Exception
{
    public HandoutFileStoreException(string message)
        : base(message)
    {
    }

    public HandoutFileStoreException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
