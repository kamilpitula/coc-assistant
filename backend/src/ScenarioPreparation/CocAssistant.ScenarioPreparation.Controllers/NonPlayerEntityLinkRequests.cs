namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Which Non-Player Entity to link: <c>Type</c> is <c>HumanNpc</c> or <c>MythosCreature</c>. Anything else is a 400 keyed <c>nonPlayerEntity</c>.</summary>
public sealed record NonPlayerEntityReferenceRequest(string? Type, Guid? Id);

/// <summary>
/// Links a Non-Player Entity to a Scene. <c>PlayerFacingDescription</c> is the Lexical document as a nested JSON value; absent
/// and <c>null</c> both mean no description (ADR 0015).
/// </summary>
public sealed record NonPlayerEntityLinkRequest(NonPlayerEntityReferenceRequest? NonPlayerEntity, string? PlayerFacingName, JsonElement? PlayerFacingDescription);

/// <summary>Edits a link's Player-facing fields. The entity is fixed after linking, so the request carries none.</summary>
public sealed record NonPlayerEntityLinkEditRequest(string? PlayerFacingName, JsonElement? PlayerFacingDescription);
