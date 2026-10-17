namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of <see cref="Scene.Create"/>: the Scene when accepted, otherwise null.</summary>
public sealed record SceneCreation(SceneFieldsOutcome Outcome, Scene? Scene);
