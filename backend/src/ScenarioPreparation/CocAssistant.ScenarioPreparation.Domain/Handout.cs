namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A Handout of a Scene or an Item (CONTEXT.md, Handout): a Read-aloud or Text Handout holding validated Lexical JSON content, or an
/// Image, Document, or Map Handout holding one stored file, with an explicit visibility and a title. Exactly one of
/// <see cref="Content"/> and <see cref="File"/> is set, and exactly one of <see cref="SceneId"/> and <see cref="ItemId"/>. A child
/// of its owner, created and changed only through the owner's methods (ADR 0019, ADR 0020). Position is written only by
/// <see cref="HandoutCollection"/> and is never exposed to clients (ADR 0014).
/// </summary>
public class Handout
{
    public const int TitleMaxLength = 200;

    /// <summary>The largest file a Handout may hold, in bytes (20 MB).</summary>
    public const long FileMaxBytes = 20 * 1024 * 1024;

    public Guid Id { get; private set; }
    public Guid? SceneId { get; private set; }
    public Guid? ItemId { get; private set; }
    public HandoutKind Kind { get; private set; }
    public HandoutVisibility Visibility { get; private set; }

    /// <summary>The trimmed title.</summary>
    public string Title { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received (ADR 0015) of a rich-text Handout; null for a file Handout.</summary>
    public string? Content { get; private set; }

    public string? FileKey { get; private set; }
    public string? FileName { get; private set; }
    public string? FileMediaType { get; private set; }
    public long? FileSizeBytes { get; private set; }

    public int Position { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The stored file of an Image, Document, or Map Handout; null for a rich-text Handout.</summary>
    public HandoutFile? File => FileKey is null ? null : new HandoutFile(FileKey, FileName!, FileMediaType!, FileSizeBytes!.Value);

    private Handout()
    {
        Title = string.Empty;
    }

    private Handout(HandoutOwner owner, HandoutKind kind, HandoutVisibility visibility, string title, string? content, HandoutFile? file, int position, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        SceneId = owner.SceneId;
        ItemId = owner.ItemId;
        Kind = kind;
        Visibility = visibility;
        Title = title;
        Content = content;
        SetFile(file);
        Position = position;
        CreatedAt = createdAt;
    }

    internal static Handout Create(HandoutOwner owner, HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, string content, int position, DateTimeOffset now) =>
        new(owner, kind, visibility, trimmedTitle, content, null, position, now);

    internal static Handout CreateFile(HandoutOwner owner, HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, HandoutFile file, int position, DateTimeOffset now) =>
        new(owner, kind, visibility, trimmedTitle, null, file, position, now);

    internal void Replace(HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, string content)
    {
        Kind = kind;
        Visibility = visibility;
        Title = trimmedTitle;
        Content = content;
    }

    /// <summary>Replaces the fields of a file Handout; a null file keeps the current one.</summary>
    internal void ReplaceFile(HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, HandoutFile? file)
    {
        Kind = kind;
        Visibility = visibility;
        Title = trimmedTitle;
        if (file is not null)
        {
            SetFile(file);
        }
    }

    /// <summary>Sets the place in the owner's order; only <see cref="HandoutCollection"/> reorders.</summary>
    internal void MoveTo(int position) => Position = position;

    /// <summary>
    /// Checks title, kind, kind change, visibility, then content, in that order; the first failure wins. The kind must be a
    /// rich-text kind, and an existing Handout (<paramref name="currentKind"/>) may not leave the rich-text family.
    /// </summary>
    internal static HandoutOutcome Validate(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, HandoutKind? currentKind, out string trimmedTitle)
    {
        var outcome = ValidateFields(false, kind, visibility, title, currentKind, out trimmedTitle);
        return outcome != HandoutOutcome.Accepted ? outcome : ValidateContent(content);
    }

    /// <summary>
    /// Checks title, kind, kind change, visibility, then the file, in that order. The kind must be a file kind; a null
    /// <paramref name="file"/> is a missing file for a new Handout and "keep the current file" for an existing one.
    /// </summary>
    internal static HandoutOutcome ValidateFile(HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, HandoutKind? currentKind, out string trimmedTitle)
    {
        var outcome = ValidateFields(true, kind, visibility, title, currentKind, out trimmedTitle);
        if (outcome != HandoutOutcome.Accepted)
        {
            return outcome;
        }

        return file is null && currentKind is not null ? HandoutOutcome.Accepted : ValidateFileDetails(kind!.Value, file);
    }

    private static HandoutOutcome ValidateFields(bool fileKinds, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutKind? currentKind, out string trimmedTitle)
    {
        trimmedTitle = title.Trim();
        if (trimmedTitle.Length is 0 or > TitleMaxLength)
        {
            return HandoutOutcome.InvalidTitle;
        }

        if (kind is null || HandoutKinds.IsFile(kind.Value) != fileKinds)
        {
            return HandoutOutcome.InvalidKind;
        }

        if (currentKind is not null && HandoutKinds.FamilyOf(currentKind.Value) != HandoutKinds.FamilyOf(kind.Value))
        {
            return HandoutOutcome.KindChangeNotAllowed;
        }

        return visibility is null ? HandoutOutcome.InvalidVisibility : HandoutOutcome.Accepted;
    }

    private static HandoutOutcome ValidateFileDetails(HandoutKind kind, HandoutFile? file)
    {
        if (file is null || file.SizeBytes <= 0)
        {
            return HandoutOutcome.MissingFile;
        }

        if (!HandoutKinds.AllowsMediaType(kind, file.MediaType))
        {
            return HandoutOutcome.UnsupportedFileType;
        }

        return file.SizeBytes > FileMaxBytes ? HandoutOutcome.FileTooLarge : HandoutOutcome.Accepted;
    }

    private static HandoutOutcome ValidateContent(string? content)
    {
        if (content is null)
        {
            return HandoutOutcome.MissingContent;
        }

        if (RichTextDocument.Validate(content) != RichTextOutcome.Accepted)
        {
            return HandoutOutcome.InvalidContent;
        }

        return RichTextDocument.HasVisibleText(content) ? HandoutOutcome.Accepted : HandoutOutcome.MissingContent;
    }

    private void SetFile(HandoutFile? file)
    {
        FileKey = file?.Key;
        FileName = file?.Name;
        FileMediaType = file?.MediaType;
        FileSizeBytes = file?.SizeBytes;
    }
}
