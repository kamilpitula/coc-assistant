namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>The Investigator who holds an Item. Always absent until Scene Play can give an Item (PBI-SPL-003).</summary>
public sealed record ItemHolderResponse(Guid InvestigatorId);

/// <summary>A Scene that links an Item, with its Scenario. Positions are never sent; clients use list order.</summary>
public sealed record ItemSceneResponse(Guid ScenarioId, string ScenarioTitle, Guid Id, string Title, string Status);

/// <summary>
/// An Item with its stored Player-facing description and Keeper notes (or null), its holder (null while no one holds it), its
/// Handouts in stored order, and the Scenes that link it in Scenario order then Scene order.
/// </summary>
public sealed record ItemResponse(
    Guid Id,
    string Name,
    JsonElement? PlayerFacingDescription,
    JsonElement? KeeperNotes,
    ItemHolderResponse? Holder,
    IReadOnlyList<HandoutSummaryResponse> Handouts,
    IReadOnlyList<ItemSceneResponse> Scenes);

/// <summary>One Item of the Campaign's list.</summary>
public sealed record ItemSummaryResponse(Guid Id, string Name, int SceneCount);

/// <summary>The Campaign's Items ordered by name.</summary>
public sealed record ItemListResponse(IReadOnlyList<ItemSummaryResponse> Items);

/// <summary>The Item a Scene link refers to, with its live name (Keeper-only).</summary>
public sealed record ItemReferenceResponse(Guid Id, string Name);

/// <summary>A Scene's link to one Item. A link has no other fields.</summary>
public sealed record ItemLinkResponse(Guid Id, ItemReferenceResponse Item);
