namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Adds or edits a Handout. <c>Kind</c> is <c>ReadAloud</c> or <c>Text</c> and <c>Visibility</c> is <c>PlayerFacing</c> or
/// <c>KeeperFacing</c>; neither has a default, and anything else is a 400 keyed by the field. <c>Content</c> is the Lexical document
/// as a nested JSON value; absent and <c>null</c> both mean missing text (ADR 0015).
/// </summary>
public sealed record HandoutRequest(string? Kind, string? Visibility, string? Title, JsonElement? Content);

/// <summary>The full ordered list of the Scene's Handout ids (ADR 0014).</summary>
public sealed record HandoutOrderRequest([Required] Guid[] HandoutIds);
