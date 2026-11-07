namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Reveal as it leaves the application layer: the snapshot, the subject id, and the Investigators it reached. The blob key stays inside.</summary>
public sealed record RevealView(
    Guid Id,
    RevealSubjectType SubjectType,
    Guid SubjectId,
    DateTimeOffset RevealedAt,
    string Title,
    HandoutKind? HandoutKind,
    string? Content,
    HandoutFileView? File,
    string? ImageDescription,
    IReadOnlyList<Guid> RecipientIds);

/// <summary>A Reveal that reached one Investigator, with the Scene it was made on (CONTEXT.md, Clue).</summary>
public sealed record ClueView(RevealView Reveal, Guid SceneId, string SceneTitle);

/// <summary>A Reveal found by the persistence read: the Reveal and the Scene it was made on.</summary>
public sealed record SceneReveal(Reveal Reveal, Guid SceneId, string SceneTitle);

/// <summary>The snapshotted file of a Reveal, with its blob key, and the Investigators the Reveal reached.</summary>
public sealed record RevealFileView(string Key, string Name, string MediaType, long SizeBytes, IReadOnlyList<Guid> RecipientIds);

/// <summary>How revealing ended; the refusals are the domain's, in its order, and NoActiveScene covers a Scene that is no longer Active. Conflict is a write that won the race after the read.</summary>
public enum SceneRevealOutcome
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

/// <summary>The Reveal when <see cref="SceneRevealOutcome.Revealed"/>, otherwise null.</summary>
public sealed record SceneRevealResult(SceneRevealOutcome Outcome, RevealView? Reveal);

/// <summary>Maps Reveals to the views that leave the application layer.</summary>
internal static class RevealViews
{
    public static RevealView ToView(Reveal reveal) =>
        new(
            reveal.Id,
            reveal.SubjectType,
            reveal.SubjectId,
            reveal.RevealedAt,
            reveal.Title,
            reveal.HandoutKind,
            reveal.Content,
            reveal.File is { } file ? new HandoutFileView(file.Name, file.MediaType, file.SizeBytes) : null,
            reveal.ImageDescription,
            reveal.RecipientIds);
}
