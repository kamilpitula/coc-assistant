namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// What the Handout services need from the aggregate that owns the Handouts (PBI-SP-008 D3): its Handouts, the six writes
/// under its own guard rules, and a save. The Scene adapter guards by status and the Item adapter by play usage; the services
/// know neither.
/// </summary>
public interface IHandoutOwner
{
    /// <summary>The owner's Handouts in their stored order.</summary>
    IReadOnlyList<Handout> Handouts { get; }

    HandoutResult AddHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, DateTimeOffset now);

    HandoutResult AddFileHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, DateTimeOffset now);

    HandoutResult EditHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content);

    /// <summary>The replaced key is returned only when the owner allows deleting the old file.</summary>
    HandoutFileEditResult EditFileHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file);

    HandoutRemovalOutcome RemoveHandout(Guid handoutId);

    HandoutOrderOutcome ReorderHandouts(IReadOnlyList<Guid> handoutIds);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
