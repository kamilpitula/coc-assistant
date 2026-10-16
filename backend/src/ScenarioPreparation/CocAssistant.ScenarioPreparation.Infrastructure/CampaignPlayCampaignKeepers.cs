namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>Adapts Campaign Play's Keeper rule to Scenario Preparation's <see cref="ICampaignKeepers"/> port (ADR 0013).</summary>
public sealed class CampaignPlayCampaignKeepers : ICampaignKeepers
{
    private readonly CampaignService _campaigns;

    public CampaignPlayCampaignKeepers(CampaignService campaigns)
    {
        _campaigns = campaigns;
    }

    public async Task<bool> IsKeeperAsync(Guid campaignId, Guid accountId, CancellationToken cancellationToken) =>
        await _campaigns.GetForKeeperAsync(campaignId, accountId, cancellationToken) is not null;
}
