namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Replaces a Scene's Keeper notes. The save names the <c>notesVersion</c> it was based on; a missing version is a 400
/// keyed <c>notesVersion</c>, and a stale one is refused with 409 carrying the current notes (ADR 0037).
/// <c>KeeperNotes</c> is the Lexical document as a nested JSON value; absent and <c>null</c> both clear the notes (ADR 0015).
/// </summary>
public record SceneKeeperNotesRequest(JsonElement? KeeperNotes, int? NotesVersion);
