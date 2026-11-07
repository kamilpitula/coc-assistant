namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>The Item a link refers to, with its live name, its holder (null while no one holds it), and its Handout summaries (Keeper-only).</summary>
public sealed record ItemReference(Guid Id, string Name, ItemHolder? Holder, IReadOnlyList<HandoutSummaryView> Handouts);

/// <summary>A Scene's link to one Item. A link has no fields of its own (ADR 0022).</summary>
public sealed record ItemLinkView(Guid Id, ItemReference Item);

/// <summary>Builds link views from the linked Items, which carry their holders and Handouts.</summary>
public static class ItemLinkViews
{
    /// <summary>Links whose Item is not in the list (deleted meanwhile) are left out.</summary>
    public static IReadOnlyList<ItemLinkView> Create(IEnumerable<ItemLink> links, IReadOnlyList<Item> items)
    {
        var byId = items.ToDictionary(item => item.Id);
        return links
            .Where(link => byId.ContainsKey(link.ItemId))
            .Select(link => new ItemLinkView(link.Id, ToReference(byId[link.ItemId])))
            .ToList();
    }

    public static ItemReference ToReference(Item item) =>
        new(
            item.Id,
            item.Name,
            item.HolderInvestigatorId is null ? null : new ItemHolder(item.HolderInvestigatorId.Value),
            item.Handouts.Select(HandoutViews.ToSummary).ToList());
}
