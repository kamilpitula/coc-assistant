namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The Handout rules shared by every owner (PBI-SP-008 D3): add, edit, remove, and reorder over the owner's own list, and the
/// Handout order of ADR 0014. The only writer of <see cref="Handout.Position"/>. It knows nothing about a Scene's status or an
/// Item's play usage: each owner checks its own guard first and then calls here.
/// </summary>
internal static class HandoutCollection
{
    /// <summary>The Handouts in the owner's order: Position, then CreatedAt, then Id (ADR 0014).</summary>
    public static IReadOnlyList<Handout> InOrder(List<Handout> handouts) =>
        handouts.OrderBy(handout => handout.Position).ThenBy(handout => handout.CreatedAt).ThenBy(handout => handout.Id).ToList();

    /// <summary>Adds a rich-text Handout after the others, or reports the first problem and adds nothing.</summary>
    public static HandoutResult Add(List<Handout> handouts, HandoutOwner owner, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, DateTimeOffset now)
    {
        var outcome = Handout.Validate(kind, visibility, title, content, null, out var trimmedTitle);
        if (outcome != HandoutOutcome.Accepted)
        {
            return new HandoutResult(outcome, null);
        }

        var handout = Handout.Create(owner, kind!.Value, visibility!.Value, trimmedTitle, content!, NextPosition(handouts), now);
        handouts.Add(handout);
        return new HandoutResult(outcome, handout);
    }

    /// <summary>Adds an Image, Document, or Map Handout after the others, or reports the first problem and adds nothing.</summary>
    public static HandoutResult AddFile(List<Handout> handouts, HandoutOwner owner, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, DateTimeOffset now)
    {
        var outcome = Handout.ValidateFile(kind, visibility, title, file, null, out var trimmedTitle);
        if (outcome != HandoutOutcome.Accepted)
        {
            return new HandoutResult(outcome, null);
        }

        var handout = Handout.CreateFile(owner, kind!.Value, visibility!.Value, trimmedTitle, file!, NextPosition(handouts), now);
        handouts.Add(handout);
        return new HandoutResult(outcome, handout);
    }

    /// <summary>Replaces a rich-text Handout's fields; the Handout is checked before the fields and its Position is kept.</summary>
    public static HandoutResult Edit(List<Handout> handouts, Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content)
    {
        var handout = handouts.Find(candidate => candidate.Id == handoutId);
        if (handout is null)
        {
            return new HandoutResult(HandoutOutcome.HandoutNotFound, null);
        }

        var outcome = Handout.Validate(kind, visibility, title, content, handout.Kind, out var trimmedTitle);
        if (outcome != HandoutOutcome.Accepted)
        {
            return new HandoutResult(outcome, null);
        }

        handout.Replace(kind!.Value, visibility!.Value, trimmedTitle, content!);
        return new HandoutResult(outcome, handout);
    }

    /// <summary>
    /// Replaces a file Handout's fields and, when one is given, its file. The replaced key is returned only when the owner
    /// allows deleting it (<paramref name="mayDeleteReplacedFile"/>), because a file that could have been revealed is kept (ADR 0021).
    /// </summary>
    public static HandoutFileEditResult EditFile(
        List<Handout> handouts,
        Guid handoutId,
        HandoutKind? kind,
        HandoutVisibility? visibility,
        string title,
        HandoutFile? file,
        bool mayDeleteReplacedFile)
    {
        var handout = handouts.Find(candidate => candidate.Id == handoutId);
        if (handout is null)
        {
            return new HandoutFileEditResult(HandoutOutcome.HandoutNotFound, null, null);
        }

        var outcome = Handout.ValidateFile(kind, visibility, title, file, handout.Kind, out var trimmedTitle);
        if (outcome != HandoutOutcome.Accepted)
        {
            return new HandoutFileEditResult(outcome, null, null);
        }

        var replacedKey = file is not null && mayDeleteReplacedFile ? handout.FileKey : null;
        handout.ReplaceFile(kind!.Value, visibility!.Value, trimmedTitle, file);
        return new HandoutFileEditResult(outcome, handout, replacedKey);
    }

    /// <summary>Removes a Handout; <see cref="HandoutRemovalOutcome.HandoutNotFound"/> when the owner has no such Handout.</summary>
    public static HandoutRemovalOutcome Remove(List<Handout> handouts, Guid handoutId)
    {
        var handout = handouts.Find(candidate => candidate.Id == handoutId);
        if (handout is null)
        {
            return HandoutRemovalOutcome.HandoutNotFound;
        }

        handouts.Remove(handout);
        return HandoutRemovalOutcome.Removed;
    }

    /// <summary>Renumbers the Handouts 1..n to the requested order (ADR 0014). All or nothing.</summary>
    public static HandoutOrderOutcome Reorder(List<Handout> handouts, IReadOnlyList<Guid> handoutIds)
    {
        if (handoutIds.Distinct().Count() != handoutIds.Count)
        {
            return HandoutOrderOutcome.DuplicateIds;
        }

        var byId = handouts.ToDictionary(handout => handout.Id);
        if (byId.Count != handoutIds.Count || !handoutIds.All(byId.ContainsKey))
        {
            return HandoutOrderOutcome.DoesNotMatchHandouts;
        }

        for (var index = 0; index < handoutIds.Count; index++)
        {
            byId[handoutIds[index]].MoveTo(index + 1);
        }

        return HandoutOrderOutcome.Reordered;
    }

    private static int NextPosition(List<Handout> handouts) => handouts.Count == 0 ? 1 : handouts.Max(existing => existing.Position) + 1;
}
