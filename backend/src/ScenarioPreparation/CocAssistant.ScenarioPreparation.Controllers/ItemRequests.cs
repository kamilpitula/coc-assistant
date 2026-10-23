namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates or replaces an Item. <c>PlayerFacingDescription</c> and <c>KeeperNotes</c> are Lexical documents as nested JSON values;
/// an absent or <c>null</c> description is a 400 keyed <c>playerFacingDescription</c>, and absent and <c>null</c> notes both mean no
/// notes (ADR 0015, ADR 0018).
/// </summary>
public sealed record ItemRequest(string? Name, JsonElement? PlayerFacingDescription, JsonElement? KeeperNotes);

/// <summary>Links an Item to a Scene. A missing or unknown id is a 400 keyed <c>itemId</c>.</summary>
public sealed record ItemLinkRequest(Guid? ItemId);
