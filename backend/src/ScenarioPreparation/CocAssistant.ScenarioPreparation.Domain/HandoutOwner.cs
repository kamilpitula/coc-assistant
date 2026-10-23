namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The one owner of a Handout: a Scene or an Item, never both and never neither (ADR 0020, CK_Handouts_OneOwner). Created
/// through <see cref="ForScene"/> or <see cref="ForItem"/> so the invariant holds by construction.
/// </summary>
internal readonly record struct HandoutOwner
{
    private HandoutOwner(Guid? sceneId, Guid? itemId)
    {
        SceneId = sceneId;
        ItemId = itemId;
    }

    public Guid? SceneId { get; }

    public Guid? ItemId { get; }

    public static HandoutOwner ForScene(Guid sceneId) => new(sceneId, null);

    public static HandoutOwner ForItem(Guid itemId) => new(null, itemId);
}
