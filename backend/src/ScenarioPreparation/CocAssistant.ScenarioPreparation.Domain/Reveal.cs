namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A Keeper's showing of one Handout (of a Scene or of a linked Item), Non-Player Entity link, or Item of an Active Scene to
/// chosen Investigators present
/// (CONTEXT.md, Reveal). It holds a snapshot of what was shown, taken when it was made, and is never updated afterwards, so a
/// later edit of the source changes nothing a Player received (ADR 0019). The subject id has no foreign key and is never sent to
/// Players. A child of its Scene, created only by <see cref="Scene.Reveal"/> (PBI-SPL-002 D1).
/// </summary>
public class Reveal
{
    private readonly List<RevealRecipient> _recipients = [];

    public Guid Id { get; private set; }
    public Guid SceneId { get; private set; }
    public RevealSubjectType SubjectType { get; private set; }
    public Guid SubjectId { get; private set; }
    public DateTimeOffset RevealedAt { get; private set; }

    /// <summary>The Handout title or the link's Player-facing name at the time of the Reveal.</summary>
    public string Title { get; private set; }

    /// <summary>The kind of a revealed Handout; null for a Non-Player Entity link.</summary>
    public HandoutKind? HandoutKind { get; private set; }

    /// <summary>The Lexical JSON text of a rich-text Handout or of a link's Player-facing description; null when there is none.</summary>
    public string? Content { get; private set; }

    public string? FileKey { get; private set; }
    public string? FileName { get; private set; }
    public string? FileMediaType { get; private set; }
    public long? FileSizeBytes { get; private set; }

    /// <summary>The image description of a revealed Image or Map Handout, kept as it was.</summary>
    public string? ImageDescription { get; private set; }

    /// <summary>The snapshotted file of a revealed file Handout; null otherwise.</summary>
    public HandoutFile? File => FileKey is null ? null : new HandoutFile(FileKey, FileName!, FileMediaType!, FileSizeBytes!.Value);

    /// <summary>The ids of the Investigators the Reveal reached, in id order.</summary>
    public IReadOnlyList<Guid> RecipientIds => _recipients.Select(recipient => recipient.InvestigatorId).Order().ToList();

    private Reveal()
    {
        Title = string.Empty;
    }

    private Reveal(Guid sceneId, RevealSubjectType subjectType, Guid subjectId, string title, DateTimeOffset revealedAt, IEnumerable<Guid> recipientIds)
    {
        Id = Guid.NewGuid();
        SceneId = sceneId;
        SubjectType = subjectType;
        SubjectId = subjectId;
        Title = title;
        RevealedAt = revealedAt;
        _recipients.AddRange(recipientIds.Select(investigatorId => RevealRecipient.Create(Id, investigatorId)));
    }

    internal static Reveal FromHandout(Guid sceneId, Handout handout, IEnumerable<Guid> recipientIds, DateTimeOffset now) =>
        new(sceneId, RevealSubjectType.Handout, handout.Id, handout.Title, now, recipientIds)
        {
            HandoutKind = handout.Kind,
            Content = handout.Content,
            FileKey = handout.FileKey,
            FileName = handout.FileName,
            FileMediaType = handout.FileMediaType,
            FileSizeBytes = handout.FileSizeBytes,
            ImageDescription = handout.ImageDescription,
        };

    internal static Reveal FromNonPlayerEntityLink(Guid sceneId, NonPlayerEntityLink link, IEnumerable<Guid> recipientIds, DateTimeOffset now) =>
        new(sceneId, RevealSubjectType.NonPlayerEntity, link.Id, link.PlayerFacingName, now, recipientIds)
        {
            Content = link.PlayerFacingDescription,
        };

    /// <summary>
    /// Snapshots an Item's name and Player-facing description (specs/scene-play/spec.md). The name fits the title length (ADR 0029).
    /// Giving never reveals Handouts; an Item's Player-facing Handouts are revealed on their own.
    /// </summary>
    internal static Reveal FromItem(Guid sceneId, Item item, IEnumerable<Guid> recipientIds, DateTimeOffset now) =>
        new(sceneId, RevealSubjectType.Item, item.Id, item.Name, now, recipientIds)
        {
            Content = item.PlayerFacingDescription,
        };
}
