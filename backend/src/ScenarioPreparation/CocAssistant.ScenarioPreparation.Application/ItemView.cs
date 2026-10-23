namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// An Item with its Player-facing description and Keeper notes (the stored Lexical JSON texts), its holder (null while no one holds
/// it), its Handout summaries in stored order, and the Scenes that link it in Scenario order then Scene order.
/// </summary>
public sealed record ItemView(
    Guid Id,
    string Name,
    string PlayerFacingDescription,
    string? KeeperNotes,
    ItemHolder? Holder,
    IReadOnlyList<HandoutSummaryView> Handouts,
    IReadOnlyList<ItemScene> Scenes);
