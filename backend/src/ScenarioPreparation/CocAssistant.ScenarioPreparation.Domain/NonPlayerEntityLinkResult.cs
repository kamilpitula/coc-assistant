namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of linking or editing a link: the link when accepted, otherwise null.</summary>
public sealed record NonPlayerEntityLinkResult(NonPlayerEntityLinkOutcome Outcome, NonPlayerEntityLink? Link);
