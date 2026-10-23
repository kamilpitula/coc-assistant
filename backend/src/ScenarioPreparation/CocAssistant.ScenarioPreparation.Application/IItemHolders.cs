namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>The Investigator who holds an Item.</summary>
public sealed record ItemHolder(Guid InvestigatorId);

/// <summary>
/// Scenario Preparation's port for who holds an Item, which Scene Play owns (ADR 0008, ADR 0022). Until PBI-SPL-003 registers a
/// Scene Play adapter, Infrastructure answers that no one holds any Item.
/// </summary>
public interface IItemHolders
{
    /// <summary>The holder of the Item, or null when no one holds it.</summary>
    Task<ItemHolder?> FindHolderAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken);
}
