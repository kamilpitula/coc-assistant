namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// A Scene's link to one Non-Player Entity: the live profile name (Keeper-only) beside the Player-facing name and the stored
/// Lexical JSON description, or null. No other profile data travels with a link.
/// </summary>
public sealed record NonPlayerEntityLinkView(Guid Id, NonPlayerEntitySummary NonPlayerEntity, string PlayerFacingName, string? PlayerFacingDescription);

/// <summary>Builds link views by resolving each link's entity in the Campaign's Non-Player Entity list.</summary>
internal static class NonPlayerEntityLinkViews
{
    /// <summary>Links whose entity is not in the list (deleted meanwhile) are left out.</summary>
    public static IReadOnlyList<NonPlayerEntityLinkView> Create(IEnumerable<NonPlayerEntityLink> links, IReadOnlyList<NonPlayerEntitySummary> entities)
    {
        var byKey = entities.ToDictionary(entity => (entity.Type, entity.Id));
        return links
            .Where(link => byKey.ContainsKey((link.Type, link.NonPlayerEntityId)))
            .Select(link => new NonPlayerEntityLinkView(link.Id, byKey[(link.Type, link.NonPlayerEntityId)], link.PlayerFacingName, link.PlayerFacingDescription))
            .ToList();
    }
}
