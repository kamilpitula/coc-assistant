namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>A recording <see cref="ISceneContentSignals"/> that keeps each signalled Campaign id, in order.</summary>
public sealed class RecordingSceneContentSignals : ISceneContentSignals
{
    public List<Guid> CampaignIds { get; } = [];

    public Task ScenesChangedAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        CampaignIds.Add(campaignId);
        return Task.CompletedTask;
    }
}
