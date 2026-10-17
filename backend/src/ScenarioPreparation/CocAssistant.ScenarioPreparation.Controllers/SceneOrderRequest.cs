namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>The full ordered list of the Scenario's Scene ids (ADR 0014).</summary>
public record SceneOrderRequest([Required] Guid[] SceneIds);
