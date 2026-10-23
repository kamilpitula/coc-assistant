namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A child of a Scene that refers to one Item of the Scene's Campaign. It has no fields of its own, because a Reveal of an Item
/// names the Item, not a link (ADR 0022). A Scene links an Item at most once.
/// </summary>
public class ItemLink
{
    public Guid Id { get; private set; }
    public Guid SceneId { get; private set; }
    public Guid ItemId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private ItemLink()
    {
    }

    private ItemLink(Guid sceneId, Guid itemId, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        SceneId = sceneId;
        ItemId = itemId;
        CreatedAt = createdAt;
    }

    internal static ItemLink Create(Guid sceneId, Guid itemId, DateTimeOffset now) => new(sceneId, itemId, now);
}
