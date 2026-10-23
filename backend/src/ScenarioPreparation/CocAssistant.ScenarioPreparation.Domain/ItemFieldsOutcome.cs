namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether creating or editing an Item was accepted, and which field refused it otherwise (checked in this order).</summary>
public enum ItemFieldsOutcome
{
    Accepted,
    InvalidName,
    MissingDescription,
    InvalidDescription,
    InvalidKeeperNotes,
}

/// <summary>The result of <see cref="Item.Create"/>: the Item when accepted, otherwise null.</summary>
public sealed record ItemCreation(ItemFieldsOutcome Outcome, Item? Item);
