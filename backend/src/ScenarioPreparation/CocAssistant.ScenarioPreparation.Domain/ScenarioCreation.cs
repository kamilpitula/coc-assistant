namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of <see cref="Scenario.Create"/>: the Scenario when accepted, otherwise null.</summary>
public sealed record ScenarioCreation(ScenarioFieldsOutcome Outcome, Scenario? Scenario);
