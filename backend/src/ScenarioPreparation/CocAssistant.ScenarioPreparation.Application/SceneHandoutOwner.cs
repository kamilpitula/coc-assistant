namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Adapts a Scene to <see cref="IHandoutOwner"/>: the Scene decides every change by its status (ADR 0019, ADR 0020).</summary>
public sealed class SceneHandoutOwner : IHandoutOwner
{
    private readonly Scene _scene;
    private readonly ISceneRepository _scenes;

    public SceneHandoutOwner(Scene scene, ISceneRepository scenes)
    {
        _scene = scene;
        _scenes = scenes;
    }

    public IReadOnlyList<Handout> Handouts => _scene.Handouts;

    public HandoutResult AddHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, string? content, DateTimeOffset now) =>
        _scene.AddHandout(kind, visibility, title, content, now);

    public HandoutResult AddFileHandout(HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file, DateTimeOffset now) =>
        _scene.AddFileHandout(kind, visibility, title, file, now);

    public HandoutResult EditHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, string? content) =>
        _scene.EditHandout(handoutId, kind, visibility, title, content);

    public HandoutFileEditResult EditFileHandout(Guid handoutId, HandoutKind? kind, HandoutVisibility? visibility, string title, HandoutFile? file) =>
        _scene.EditFileHandout(handoutId, kind, visibility, title, file);

    public HandoutRemovalOutcome RemoveHandout(Guid handoutId) => _scene.RemoveHandout(handoutId);

    public HandoutOrderOutcome ReorderHandouts(IReadOnlyList<Guid> handoutIds) => _scene.ReorderHandouts(handoutIds);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _scenes.SaveChangesAsync(cancellationToken);
}
