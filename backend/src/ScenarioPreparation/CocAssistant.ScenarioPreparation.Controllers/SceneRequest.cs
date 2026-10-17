namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates or edits a Scene. The title is checked by the domain, so a missing or blank title is a 400 keyed <c>title</c>.
/// <c>KeeperNotes</c> is the Lexical document as a nested JSON value; absent and <c>null</c> both mean no notes (ADR 0015).
/// </summary>
public record SceneRequest(string? Title, string? Location, JsonElement? KeeperNotes);
