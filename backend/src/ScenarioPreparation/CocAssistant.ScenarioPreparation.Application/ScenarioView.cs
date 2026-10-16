namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Scenario as the Keeper sees it. Its Position is never exposed; clients use list order.</summary>
public sealed record ScenarioView(Guid Id, string Title, string KeeperNotes);
