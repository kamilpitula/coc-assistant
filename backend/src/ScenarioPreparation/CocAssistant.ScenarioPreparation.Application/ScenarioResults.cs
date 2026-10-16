namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing a Scenario ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum ScenarioWriteOutcome
{
    Saved,
    NotFound,
    InvalidTitle,
    InvalidKeeperNotes,
}

/// <summary>The Scenario when <see cref="ScenarioWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record ScenarioWriteResult(ScenarioWriteOutcome Outcome, ScenarioView? Scenario);

/// <summary>How reordering a Campaign's Scenarios ended.</summary>
public enum ScenarioReorderOutcome
{
    Reordered,
    NotFound,
    DuplicateIds,
    DoesNotMatchScenarios,
}

/// <summary>The Campaign's Scenarios in the new order when <see cref="ScenarioReorderOutcome.Reordered"/>, otherwise null.</summary>
public sealed record ScenarioReorderResult(ScenarioReorderOutcome Outcome, IReadOnlyList<ScenarioView>? Scenarios);
