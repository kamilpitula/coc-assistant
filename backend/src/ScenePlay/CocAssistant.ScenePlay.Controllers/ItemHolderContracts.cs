namespace CocAssistant.ScenePlay.Controllers;

/// <summary>Gives an Item to an Investigator present in the Active Scene.</summary>
public record GiveItemRequest(Guid InvestigatorId);

/// <summary>A held Item as a Player sees it: the give Reveal's snapshot without any Item id.</summary>
public record HeldItemResponse(Guid RevealId, string Name, JsonElement? Description, DateTimeOffset GivenAt);

/// <summary>The calling Player's held Items, newest first.</summary>
public record HeldItemsResponse(string? InvestigatorName, IReadOnlyList<HeldItemResponse> Items);

/// <summary>A held Item as the Keeper sees it: the Player view plus the Item id.</summary>
public record KeeperHeldItemResponse(Guid ItemId, Guid RevealId, string Name, JsonElement? Description, DateTimeOffset GivenAt);

/// <summary>An Approved Investigator's held Items for the Keeper, newest first.</summary>
public record KeeperHeldItemsResponse(string? InvestigatorName, IReadOnlyList<KeeperHeldItemResponse> Items);

/// <summary>The titles and field messages of the Item holder problems (ADR 0018).</summary>
internal static class ItemHolderProblems
{
    public const string ItemIdKey = "itemId";
    public const string InvestigatorIdKey = "investigatorId";
    public const string ItemNotInCampaignMessage = "This Item is not in the Campaign.";
    public const string ItemNotLinkedMessage = "This Item is not linked to the Active Scene.";
    public const string InvestigatorNotPresentMessage = "Only Investigators present can hold an Item.";
    public const string AlreadyHolderMessage = "This Investigator already holds the Item.";
    public const string ConflictTitle = "Another change won the race. Fetch again and try again.";
}
