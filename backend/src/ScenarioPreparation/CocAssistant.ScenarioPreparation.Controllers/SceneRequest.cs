namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates a Scene. The title is checked by the domain, so a missing or blank title is a 400 keyed <c>title</c>.
/// <c>KeeperNotes</c> is the Lexical document as a nested JSON value; absent and <c>null</c> both mean no notes (ADR 0015).
/// </summary>
public record SceneRequest(string? Title, string? Location, JsonElement? KeeperNotes);

/// <summary>
/// Replaces a Scene's title and location. Keeper notes are never accepted here; they are saved through the Keeper notes
/// endpoint with their own version (ADR 0037), so even a body that carries <c>keeperNotes</c> leaves them unchanged.
/// </summary>
public record SceneEditRequest(string? Title, string? Location);
