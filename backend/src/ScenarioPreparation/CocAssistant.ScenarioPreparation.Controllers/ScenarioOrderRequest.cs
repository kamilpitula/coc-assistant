namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>The full ordered list of the Campaign's Scenario ids (ADR 0014).</summary>
public record ScenarioOrderRequest([Required] Guid[] ScenarioIds);
