namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>One row of the Campaign's Non-Player Entity list. The profile itself is never part of the list.</summary>
public sealed record NonPlayerEntitySummary(Guid Id, NonPlayerEntityType Type, string Name);

/// <summary>
/// Application read port for the Campaign's Non-Player Entity list across aggregates (Human NPCs now, Mythos Creatures
/// later), implemented by Infrastructure as a projection per table.
/// </summary>
public interface INonPlayerEntityDirectory
{
    /// <summary>The Campaign's Non-Player Entities ordered by name, then id.</summary>
    Task<IReadOnlyList<NonPlayerEntitySummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken);
}
