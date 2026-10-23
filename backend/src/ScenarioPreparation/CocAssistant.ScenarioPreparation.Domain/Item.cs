namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A Campaign's Item (CONTEXT.md, Item): a name that Players see, a required Player-facing rich-text description, optional
/// Keeper notes, and its own ordered Handouts. It stores its Campaign id only (ADR 0013) and has no holder: who holds an Item is
/// owned by Scene Play and read through a port (ADR 0022). The Item and its Handouts stay editable whatever the status of the
/// Scenes that link it; whether the Item is in play only restricts deleting a Handout and deleting a replaced file.
/// </summary>
public class Item
{
    public const int NameMaxLength = 200;

    private readonly List<Handout> _handouts = [];

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }

    /// <summary>The trimmed name.</summary>
    public string Name { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received (ADR 0015), with visible text.</summary>
    public string PlayerFacingDescription { get; private set; }

    /// <summary>The validated Lexical JSON text exactly as received, or null when the Item has no Keeper notes.</summary>
    public string? KeeperNotes { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The Handouts in the Item's order: Position, then CreatedAt, then Id (ADR 0014).</summary>
    public IReadOnlyList<Handout> Handouts => HandoutCollection.InOrder(_handouts);

    private Item()
    {
        Name = string.Empty;
        PlayerFacingDescription = string.Empty;
    }

    private Item(Guid campaignId, string name, string playerFacingDescription, string? keeperNotes, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Name = name;
        PlayerFacingDescription = playerFacingDescription;
        KeeperNotes = keeperNotes;
        CreatedAt = createdAt;
    }

    /// <summary>Creates an Item, or reports the first field outside its rules.</summary>
    public static ItemCreation Create(Guid campaignId, string name, string? playerFacingDescription, string? keeperNotes, DateTimeOffset now)
    {
        var outcome = Validate(name, playerFacingDescription, keeperNotes, out var trimmedName);
        return outcome == ItemFieldsOutcome.Accepted
            ? new ItemCreation(outcome, new Item(campaignId, trimmedName, playerFacingDescription!, keeperNotes, now))
            : new ItemCreation(outcome, null);
    }

    /// <summary>Replaces the name, Player-facing description, and Keeper notes under the creation rules; a refused edit changes nothing.</summary>
    public ItemFieldsOutcome Edit(string name, string? playerFacingDescription, string? keeperNotes)
    {
        var outcome = Validate(name, playerFacingDescription, keeperNotes, out var trimmedName);
        if (outcome == ItemFieldsOutcome.Accepted)
        {
            Name = trimmedName;
            PlayerFacingDescription = playerFacingDescription!;
            KeeperNotes = keeperNotes;
        }

        return outcome;
    }

    /// <summary>Adds a rich-text Handout after the others. An Item is never Finished, so only the fields can refuse it.</summary>
    public HandoutResult AddHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, DateTimeOffset now) =>
        HandoutCollection.Add(_handouts, HandoutOwner.ForItem(Id), kind, visibility, title, content, now);

    /// <summary>Adds an Image, Document, or Map Handout after the others. The caller has detected the file's media type from its bytes.</summary>
    public HandoutResult AddFileHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, DateTimeOffset now) =>
        HandoutCollection.AddFile(_handouts, HandoutOwner.ForItem(Id), kind, visibility, title, file, now);

    /// <summary>Replaces a rich-text Handout's fields, including its kind; Position is kept.</summary>
    public HandoutResult EditHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content) =>
        HandoutCollection.Edit(_handouts, handoutId, kind, visibility, title, content);

    /// <summary>
    /// Replaces a file Handout's fields and, when one is given, its file. While the Item is in play the replaced key is not
    /// returned, so the old stored file is kept (ADR 0022).
    /// </summary>
    public HandoutFileEditResult EditFileHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, bool isInPlay) =>
        HandoutCollection.EditFile(_handouts, handoutId, kind, visibility, title, file, mayDeleteReplacedFile: !isInPlay);

    /// <summary>Removes a Handout only while the Item is not in play; that is checked before the Handout, so an unknown id is still refused.</summary>
    public HandoutRemovalOutcome RemoveHandout(Guid handoutId, bool isInPlay) =>
        isInPlay ? HandoutRemovalOutcome.ItemInPlay : HandoutCollection.Remove(_handouts, handoutId);

    /// <summary>Renumbers the Handouts 1..n to the requested order (ADR 0014). All or nothing.</summary>
    public HandoutOrderOutcome ReorderHandouts(IReadOnlyList<Guid> handoutIds) => HandoutCollection.Reorder(_handouts, handoutIds);

    private static ItemFieldsOutcome Validate(string name, string? description, string? keeperNotes, out string trimmedName)
    {
        trimmedName = name.Trim();
        if (trimmedName.Length is 0 or > NameMaxLength)
        {
            return ItemFieldsOutcome.InvalidName;
        }

        var descriptionOutcome = ValidateDescription(description);
        if (descriptionOutcome != ItemFieldsOutcome.Accepted)
        {
            return descriptionOutcome;
        }

        return keeperNotes is null || RichTextDocument.Validate(keeperNotes) == RichTextOutcome.Accepted
            ? ItemFieldsOutcome.Accepted
            : ItemFieldsOutcome.InvalidKeeperNotes;
    }

    private static ItemFieldsOutcome ValidateDescription(string? description)
    {
        if (description is null)
        {
            return ItemFieldsOutcome.MissingDescription;
        }

        if (RichTextDocument.Validate(description) != RichTextOutcome.Accepted)
        {
            return ItemFieldsOutcome.InvalidDescription;
        }

        return RichTextDocument.HasVisibleText(description) ? ItemFieldsOutcome.Accepted : ItemFieldsOutcome.MissingDescription;
    }
}
