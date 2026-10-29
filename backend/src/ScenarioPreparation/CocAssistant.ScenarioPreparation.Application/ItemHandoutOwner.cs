namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Adapts an Item to <see cref="IHandoutOwner"/>. It carries the fact the locator worked out when it loaded the Item (a linked
/// Scene is Active or Finished, or an Investigator holds it), and the Item decides every change by it (ADR 0022).
/// </summary>
public sealed class ItemHandoutOwner : IHandoutOwner
{
    private readonly Item _item;
    private readonly bool _isInPlay;
    private readonly IReadOnlyList<Scene> _linkingPreparedScenes;
    private readonly IItemRepository _items;

    public ItemHandoutOwner(Item item, bool isInPlay, IReadOnlyList<Scene> linkingPreparedScenes, IItemRepository items)
    {
        _item = item;
        _isInPlay = isInPlay;
        _linkingPreparedScenes = linkingPreparedScenes;
        _items = items;
    }

    public HandoutRemoveOutcome RemoveRefusedAfterConcurrentChange => HandoutRemoveOutcome.InPlay;

    public IReadOnlyList<Handout> Handouts => _item.Handouts;

    public HandoutResult AddHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, DateTimeOffset now) =>
        _item.AddHandout(kind, visibility, title, content, now);

    public HandoutResult AddFileHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, DateTimeOffset now) =>
        _item.AddFileHandout(kind, visibility, title, file, now);

    public HandoutResult EditHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content) =>
        _item.EditHandout(handoutId, kind, visibility, title, content);

    // A blob is deleted only when the Item is not in play, so the Prepared Scenes that link it are guarded against a start (ADR 0025).
    public HandoutFileEditResult EditFileHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file)
    {
        var result = _item.EditFileHandout(handoutId, kind, visibility, title, file, _isInPlay);
        if (result.ReplacedKey is not null)
        {
            LinkedSceneGuard.Guard(_linkingPreparedScenes);
        }

        return result;
    }

    public HandoutRemovalOutcome RemoveHandout(Guid handoutId)
    {
        var outcome = _item.RemoveHandout(handoutId, _isInPlay);
        if (outcome == HandoutRemovalOutcome.Removed)
        {
            LinkedSceneGuard.Guard(_linkingPreparedScenes);
        }

        return outcome;
    }

    public HandoutOrderOutcome ReorderHandouts(IReadOnlyList<Guid> handoutIds) => _item.ReorderHandouts(handoutIds);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _items.SaveChangesAsync(cancellationToken);
}
