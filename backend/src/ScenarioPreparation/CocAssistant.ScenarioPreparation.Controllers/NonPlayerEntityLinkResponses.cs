namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// A Scene's link: the entity reference with its live profile name (Keeper-only), the Player-facing name, and the stored
/// description or null. No other profile data is part of a link.
/// </summary>
public sealed record NonPlayerEntityLinkResponse(
    Guid Id,
    NonPlayerEntitySummaryResponse NonPlayerEntity,
    string PlayerFacingName,
    JsonElement? PlayerFacingDescription);
