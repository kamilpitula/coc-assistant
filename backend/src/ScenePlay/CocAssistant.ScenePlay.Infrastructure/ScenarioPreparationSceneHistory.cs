namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.SceneLifecycleService"/> to Scene Play's
/// history port (PBI-SPL-004 D1): played Scenes map field by field, with their Reveals through the existing
/// <see cref="ScenarioPreparationSceneReveals.ToRecord"/> and their Roll Requests grouped by Scene through
/// <see cref="ScenarioPreparationRollRequests.ToRecord"/>. A request whose Scene is not listed is dropped (requests are
/// created only on the Active Scene, so this cannot occur).
/// </summary>
public sealed class ScenarioPreparationSceneHistory : ISceneHistory
{
    private readonly CocAssistant.ScenarioPreparation.Application.SceneLifecycleService _lifecycle;
    private readonly CocAssistant.ScenarioPreparation.Application.SceneRollRequestService _requests;

    public ScenarioPreparationSceneHistory(
        CocAssistant.ScenarioPreparation.Application.SceneLifecycleService lifecycle,
        CocAssistant.ScenarioPreparation.Application.SceneRollRequestService requests)
    {
        _lifecycle = lifecycle;
        _requests = requests;
    }

    public async Task<IReadOnlyList<PlayedScene>> ListPlayedAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var played = await _lifecycle.ListPlayedAsync(campaignId, cancellationToken);
        var requests = await _requests.ListForCampaignAsync(campaignId, cancellationToken);
        var byScene = requests.GroupBy(request => request.SceneId).ToDictionary(group => group.Key, group => group.ToList());
        return played
            .Select(view => new PlayedScene(
                view.SceneId,
                view.ScenarioId,
                view.ScenarioTitle,
                view.Title,
                view.StartedAt,
                view.FinishedAt,
                view.InvestigatorsPresent,
                view.Reveals.Select(ScenarioPreparationSceneReveals.ToRecord).ToList(),
                byScene.TryGetValue(view.SceneId, out var sceneRequests)
                    ? sceneRequests.Select(ScenarioPreparationRollRequests.ToRecord).ToList()
                    : []))
            .ToList();
    }
}
