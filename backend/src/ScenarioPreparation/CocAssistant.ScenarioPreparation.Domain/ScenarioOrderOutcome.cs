namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of applying a requested order to a Campaign's Scenarios.</summary>
public enum ScenarioOrderOutcome
{
    Reordered,
    DuplicateIds,
    DoesNotMatchScenarios,
}
