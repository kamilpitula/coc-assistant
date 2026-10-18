namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Lists a Campaign's Non-Player Entities for its Keeper. The Keeper check runs first; everyone else gets null and no
/// entity is read (ADR 0013).
/// </summary>
public class NonPlayerEntityService
{
    private readonly ICampaignKeepers _keepers;
    private readonly INonPlayerEntityDirectory _directory;

    public NonPlayerEntityService(ICampaignKeepers keepers, INonPlayerEntityDirectory directory)
    {
        _keepers = keepers;
        _directory = directory;
    }

    /// <summary>The Campaign's Non-Player Entities by name; null when the caller is not the Keeper.</summary>
    public async Task<IReadOnlyList<NonPlayerEntitySummary>?> ListAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _directory.ListForCampaignAsync(campaignId, cancellationToken)
            : null;
}
