namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a change to a Scene's Item links was accepted, and which rule refused it otherwise.</summary>
public enum ItemLinkOutcome
{
    Linked,
    AlreadyLinked,
    Unlinked,
    SceneFinished,
    ItemNotInCampaign,
    LinkNotFound,
}

/// <summary>The result of linking an Item: the link when <see cref="ItemLinkOutcome.Linked"/> or <see cref="ItemLinkOutcome.AlreadyLinked"/>, otherwise null.</summary>
public sealed record ItemLinkResult(ItemLinkOutcome Outcome, ItemLink? Link);
