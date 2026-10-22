namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of adding or editing a Handout: the Handout when accepted, otherwise null.</summary>
public sealed record HandoutResult(HandoutOutcome Outcome, Handout? Handout);
