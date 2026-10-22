namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Answers a fixed value and records each call, so tests can prove the usage check runs after the find.</summary>
public sealed class RecordingNonPlayerEntityUsage : INonPlayerEntityUsage
{
    private readonly bool _linked;

    public RecordingNonPlayerEntityUsage(bool linked) => _linked = linked;

    public List<(Guid CampaignId, NonPlayerEntityType Type, Guid NonPlayerEntityId)> Calls { get; } = [];

    public Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken)
    {
        Calls.Add((campaignId, type, nonPlayerEntityId));
        return Task.FromResult(_linked);
    }
}
