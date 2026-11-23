namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Adapts Campaign Play's <see cref="PublishScenesChanged"/> to Scenario Preparation's <see cref="ISceneContentSignals"/>
/// port (ADR 0036). A failed publish never fails the caller (ADR 0009): it is logged and swallowed, while cancellation
/// still propagates.
/// </summary>
public sealed class CampaignPlaySceneContentSignals : ISceneContentSignals
{
    private readonly PublishScenesChanged _publisher;
    private readonly ILogger<CampaignPlaySceneContentSignals> _logger;

    public CampaignPlaySceneContentSignals(PublishScenesChanged publisher, ILogger<CampaignPlaySceneContentSignals> logger)
    {
        _publisher = publisher;
        _logger = logger;
    }

    public async Task ScenesChangedAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        try
        {
            await _publisher.PublishAsync(campaignId, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Publishing the scenes live update for Campaign {CampaignId} failed.", campaignId);
        }
    }
}
