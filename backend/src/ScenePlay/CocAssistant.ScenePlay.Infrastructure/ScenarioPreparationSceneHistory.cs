namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.SceneLifecycleService"/> to Scene Play's
/// history port (PBI-SPL-004 D1): played Scenes map field by field, with their Reveals through the existing
/// <see cref="ScenarioPreparationSceneReveals.ToRecord"/>.
/// </summary>
public sealed class ScenarioPreparationSceneHistory : ISceneHistory
{
    private readonly CocAssistant.ScenarioPreparation.Application.SceneLifecycleService _lifecycle;

    public ScenarioPreparationSceneHistory(CocAssistant.ScenarioPreparation.Application.SceneLifecycleService lifecycle)
    {
        _lifecycle = lifecycle;
    }

    public async Task<IReadOnlyList<PlayedScene>> ListPlayedAsync(Guid campaignId, CancellationToken cancellationToken) =>
        (await _lifecycle.ListPlayedAsync(campaignId, cancellationToken))
            .Select(view => new PlayedScene(
                view.SceneId,
                view.ScenarioId,
                view.ScenarioTitle,
                view.Title,
                view.StartedAt,
                view.FinishedAt,
                view.InvestigatorsPresent,
                view.Reveals.Select(ScenarioPreparationSceneReveals.ToRecord).ToList()))
            .ToList();
}
