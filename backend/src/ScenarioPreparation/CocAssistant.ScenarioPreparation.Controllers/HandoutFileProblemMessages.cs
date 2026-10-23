namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>A 400 problem: the camelCase request path it is keyed by and the server-owned message (ADR 0018).</summary>
internal sealed record HandoutFileProblem(string Key, string Message);

/// <summary>
/// The server-owned copy of each file Handout problem (ADR 0018), specified in specs/scenario-preparation/ux.md sections 50 to 58.
/// The 400 keys are the camelCase multipart field names. The kind is validated before the file, so the family of a file problem is known.
/// </summary>
internal static class HandoutFileProblemMessages
{
    public const string KindKey = "kind";
    public const string FileKey = "file";

    public const string Kind = "Choose Image, Document, or Map.";

    /// <summary>The 503 title when a file could not be written to storage or read back.</summary>
    public const string StorageFailedTitle = "The image or PDF couldn't be stored. Try again.";

    private static readonly Dictionary<HandoutWriteOutcome, Func<FileSubmission, HandoutFileProblem>> Problems = new()
    {
        [HandoutWriteOutcome.InvalidTitle] = submission => new(HandoutProblemMessages.TitleKey, HandoutProblemMessages.Title(submission.Title)),
        [HandoutWriteOutcome.InvalidKind] = _ => new(KindKey, Kind),
        [HandoutWriteOutcome.KindChangeNotAllowed] = _ => new(KindKey, HandoutProblemMessages.KindChangeNotAllowed),
        [HandoutWriteOutcome.InvalidVisibility] = _ => new(HandoutProblemMessages.VisibilityKey, HandoutProblemMessages.Visibility),
        [HandoutWriteOutcome.MissingFile] = submission => new(FileKey, submission.IsDocument ? "Choose a PDF." : "Choose an image."),
        [HandoutWriteOutcome.UnsupportedFileType] = submission => new(FileKey, submission.IsDocument ? "This isn't a PDF. Choose a PDF." : "Choose a PNG, JPEG, WebP, or GIF image."),
        [HandoutWriteOutcome.FileTooLarge] = submission => new(FileKey, submission.IsDocument ? "The PDF is larger than 20 MB. Choose a smaller one." : "The image is larger than 20 MB. Choose a smaller one."),
    };

    /// <summary>The 400 problem for an outcome, or null when the outcome is not a 400.</summary>
    public static HandoutFileProblem? For(HandoutWriteOutcome outcome, string? submittedTitle, HandoutKind? submittedKind) =>
        Problems.TryGetValue(outcome, out var problem) ? problem(new FileSubmission(submittedTitle, submittedKind == HandoutKind.Document)) : null;

    private readonly record struct FileSubmission(string? Title, bool IsDocument);
}
