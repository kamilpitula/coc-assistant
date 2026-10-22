namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A rich-text Handout of a Scene (CONTEXT.md, Handout): a Read-aloud or Text Handout with an explicit visibility, a title, and
/// validated Lexical JSON content. A child of its Scene, created and changed only through Scene methods (ADR 0019, ADR 0020).
/// Position is written only by the Scene when adding and reordering and is never exposed to clients (ADR 0014).
/// </summary>
public class Handout
{
    public const int TitleMaxLength = 200;

    public Guid Id { get; private set; }
    public Guid SceneId { get; private set; }
    public HandoutKind Kind { get; private set; }
    public HandoutVisibility Visibility { get; private set; }

    /// <summary>The trimmed title.</summary>
    public string Title { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received (ADR 0015); never null and never without visible text.</summary>
    public string Content { get; private set; }

    public int Position { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Handout()
    {
        Title = string.Empty;
        Content = string.Empty;
    }

    private Handout(Guid sceneId, HandoutKind kind, HandoutVisibility visibility, string title, string content, int position, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        SceneId = sceneId;
        Kind = kind;
        Visibility = visibility;
        Title = title;
        Content = content;
        Position = position;
        CreatedAt = createdAt;
    }

    internal static Handout Create(Guid sceneId, HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, string content, int position, DateTimeOffset now) =>
        new(sceneId, kind, visibility, trimmedTitle, content, position, now);

    internal void Replace(HandoutKind kind, HandoutVisibility visibility, string trimmedTitle, string content)
    {
        Kind = kind;
        Visibility = visibility;
        Title = trimmedTitle;
        Content = content;
    }

    /// <summary>Sets the place in the Scene's order; only the Scene adds and reorders.</summary>
    internal void MoveTo(int position) => Position = position;

    /// <summary>Checks title, kind, visibility, then content, in that order; the first failure wins.</summary>
    internal static HandoutOutcome Validate(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, out string trimmedTitle)
    {
        trimmedTitle = title.Trim();
        if (trimmedTitle.Length is 0 or > TitleMaxLength)
        {
            return HandoutOutcome.InvalidTitle;
        }

        if (kind is null)
        {
            return HandoutOutcome.InvalidKind;
        }

        if (visibility is null)
        {
            return HandoutOutcome.InvalidVisibility;
        }

        return ValidateContent(content);
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
}
