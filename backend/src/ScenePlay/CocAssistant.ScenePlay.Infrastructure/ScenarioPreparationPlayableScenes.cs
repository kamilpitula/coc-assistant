namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.SceneLifecycleService"/> to Scene Play's
/// command port (ADR 0024). Outcomes carry the same names on both sides, so they map by name; a test proves every member maps.
/// </summary>
public sealed class ScenarioPreparationPlayableScenes : IPlayableScenes
{
    private readonly CocAssistant.ScenarioPreparation.Application.SceneLifecycleService _lifecycle;

    public ScenarioPreparationPlayableScenes(CocAssistant.ScenarioPreparation.Application.SceneLifecycleService lifecycle)
    {
        _lifecycle = lifecycle;
    }

    public async Task<PlayableScene?> FindActiveAsync(Guid campaignId, CancellationToken cancellationToken) =>
        ToScene(await _lifecycle.FindActiveAsync(campaignId, cancellationToken));

    public async Task<StartSceneResult> StartAsync(
        Guid campaignId,
        Guid sceneId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        bool finishActiveScene,
        CancellationToken cancellationToken)
    {
        var result = await _lifecycle.StartAsync(campaignId, sceneId, presentInvestigatorIds, approvedInvestigatorIds, finishActiveScene, cancellationToken);
        return new StartSceneResult(Map<StartSceneOutcome>(result.Outcome), ToScene(result.Started), ToScene(result.Finished));
    }

    public async Task<FinishSceneResult> FinishActiveAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var result = await _lifecycle.FinishActiveAsync(campaignId, cancellationToken);
        return new FinishSceneResult(Map<FinishSceneOutcome>(result.Outcome), ToScene(result.Finished));
    }

    public async Task<ChangePresentResult> ReplaceInvestigatorsPresentAsync(
        Guid campaignId,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        IReadOnlyCollection<Guid> approvedInvestigatorIds,
        CancellationToken cancellationToken)
    {
        var result = await _lifecycle.ReplaceInvestigatorsPresentAsync(campaignId, presentInvestigatorIds, approvedInvestigatorIds, cancellationToken);
        return new ChangePresentResult(Map<ChangePresentOutcome>(result.Outcome), ToScene(result.Scene));
    }

    internal static TOutcome Map<TOutcome>(Enum outcome)
        where TOutcome : struct, Enum => Enum.Parse<TOutcome>(outcome.ToString());

    private static PlayableScene? ToScene(CocAssistant.ScenarioPreparation.Application.PlayableSceneView? view) =>
        view is null
            ? null
            : new PlayableScene(view.SceneId, view.ScenarioId, view.ScenarioTitle, view.Title, view.Location, view.StartedAt, view.InvestigatorsPresent);
}
