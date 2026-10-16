namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// Creates or edits a Scenario. The Title is required but checked by the domain, so a missing, empty, or blank Title
/// is a 400 keyed <c>title</c> like the other field errors.
/// </summary>
public record ScenarioRequest(string? Title, string? KeeperNotes);
