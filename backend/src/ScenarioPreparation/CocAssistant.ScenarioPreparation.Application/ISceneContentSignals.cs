namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Consumer-owned port (ADR 0008, ADR 0036): tells the Keeper's connected members that Scene content changed, so their
/// other tabs refetch (specs/scene-play/spec.md, Live updates). The call is best-effort and never throws except on
/// cancellation; the topic carries no data, so it carries no Scene ids.
/// </summary>
public interface ISceneContentSignals
{
    Task ScenesChangedAsync(Guid campaignId, CancellationToken cancellationToken);
}
