namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>The Item a link refers to, with its live name (Keeper-only).</summary>
public sealed record ItemReference(Guid Id, string Name);

/// <summary>A Scene's link to one Item. A link has no fields of its own (ADR 0022).</summary>
public sealed record ItemLinkView(Guid Id, ItemReference Item);

/// <summary>Builds link views by resolving each link's Item in the Campaign's Item list.</summary>
internal static class ItemLinkViews
{
    /// <summary>Links whose Item is not in the list (deleted meanwhile) are left out.</summary>
    public static IReadOnlyList<ItemLinkView> Create(IEnumerable<ItemLink> links, IReadOnlyList<ItemSummary> items)
    {
        var byId = items.ToDictionary(item => item.Id);
        return links
            .Where(link => byId.ContainsKey(link.ItemId))
            .Select(link => new ItemLinkView(link.Id, new ItemReference(link.ItemId, byId[link.ItemId].Name)))
            .ToList();
    }
}
