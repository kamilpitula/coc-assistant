namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Scenario Preparation's port for Campaign ownership, implemented in its Infrastructure over Campaign Play (ADR 0013).
/// Anyone who is not the Keeper, including for a missing Campaign, is false.
/// </summary>
public interface ICampaignKeepers
{
    Task<bool> IsKeeperAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken);
}
