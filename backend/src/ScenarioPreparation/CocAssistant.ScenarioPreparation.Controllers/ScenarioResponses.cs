namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>A Scenario for its Keeper. The position is never sent; clients use list order.</summary>
public sealed record ScenarioResponse(Guid Id, string Title, string KeeperNotes);

/// <summary>A Campaign's Scenarios in Campaign order.</summary>
public sealed record ScenarioListResponse(IReadOnlyList<ScenarioResponse> Scenarios);
