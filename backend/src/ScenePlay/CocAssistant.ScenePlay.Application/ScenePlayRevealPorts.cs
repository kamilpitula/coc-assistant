namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// What a Reveal shows. Unknown is a type the request did not name or does not exist; it is refused after the Active Scene check
/// and never reaches the provider.
/// </summary>
public enum RevealSubjectKind
{
    Handout,
    NonPlayerEntity,
    Item,
    Unknown,
}

/// <summary>The stored file details of a revealed Handout; the blob key never leaves the provider and the file port.</summary>
public sealed record RevealedFileDetails(string Name, string MediaType, long SizeBytes);

/// <summary>A Reveal as the provider returns it: the snapshot, the subject id, and the Investigators it reached.</summary>
public sealed record SceneRevealRecord(
    Guid Id,
    RevealSubjectKind SubjectKind,
    Guid SubjectId,
    DateTimeOffset RevealedAt,
    string Title,
    string? HandoutKind,
    string? Content,
    RevealedFileDetails? File,
    string? ImageDescription,
    IReadOnlyList<Guid> RecipientIds);

/// <summary>A Reveal that reached one Investigator with the Scene it was made on.</summary>
public sealed record ClueRecord(SceneRevealRecord Reveal, Guid SceneId, string SceneTitle);

/// <summary>The snapshotted file of a Reveal with its blob key and the Investigators the Reveal reached.</summary>
public sealed record RevealFileRecord(string FileKey, string Name, string MediaType, long SizeBytes, IReadOnlyList<Guid> RecipientIds);

/// <summary>How revealing ended in the provider; the refusals are the domain's, in its order. Conflict is a write that won the race after the read.</summary>
public enum RevealOutcome
{
    Revealed,
    NoActiveScene,
    SubjectNotRevealable,
    SubjectNotFound,
    SubjectKeeperFacing,
    NoRecipient,
    DuplicateRecipient,
    RecipientNotPresent,
    Conflict,
}

/// <summary>The Reveal when <see cref="RevealOutcome.Revealed"/>, otherwise null.</summary>
public sealed record RevealRecordResult(RevealOutcome Outcome, SceneRevealRecord? Reveal);

/// <summary>
/// Consumer-owned port onto the Scene's Reveals (ADR 0008, ADR 0024; PBI-SPL-002 D1). It performs no authorization:
/// <see cref="RevealService"/> checks the Keeper, or the Player's recipient status, before it calls.
/// </summary>
public interface ISceneReveals
{
    /// <summary>Reveals a subject of the Active Scene; null <paramref name="recipientIds"/> means every Investigator present.</summary>
    Task<RevealRecordResult> RevealAsync(Guid campaignId, RevealSubjectKind subjectKind, Guid subjectId, IReadOnlyCollection<Guid>? recipientIds, CancellationToken cancellationToken);

    /// <summary>The Reveals that reached the Investigator across the Campaign's Scenes, newest first.</summary>
    Task<IReadOnlyList<ClueRecord>> ListCluesAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken);

    /// <summary>A Reveal's snapshotted file and recipients; null when the Reveal is not in the Campaign or has no file.</summary>
    Task<RevealFileRecord?> FindFileAsync(Guid campaignId, Guid revealId, CancellationToken cancellationToken);
}

/// <summary>A storage failure of an <see cref="IRevealedFiles"/>, including a blob that is not there.</summary>
public sealed class RevealedFileStorageException : Exception
{
    public RevealedFileStorageException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

/// <summary>Consumer-owned port onto the stored files of revealed Handouts (PBI-SPL-002 D3, ADR 0026).</summary>
public interface IRevealedFiles
{
    /// <summary>The stored bytes; the caller disposes the stream. Throws <see cref="RevealedFileStorageException"/> on any storage failure.</summary>
    Task<Stream> OpenReadAsync(string fileKey, CancellationToken cancellationToken);
}

/// <summary>Consumer-owned port: tells the Keeper and the targeted Players' accounts that a Reveal was made (topics sceneReveals and myClues, no data).</summary>
public interface IRevealSignals
{
    Task RevealMadeAsync(Guid campaignId, IReadOnlyCollection<Guid> recipientAccountIds, CancellationToken cancellationToken);
}
