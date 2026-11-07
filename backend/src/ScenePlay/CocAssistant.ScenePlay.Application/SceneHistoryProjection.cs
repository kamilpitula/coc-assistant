namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects played Scenes by who asks: the Keeper sees every Reveal with its recipients and the Investigators present, a Player
/// sees only the Reveals that reached their own Investigator (specs/scene-play/spec.md, Scene History).
/// </summary>
internal static class SceneHistoryProjection
{
    public static KeeperHistorySceneView ForKeeper(PlayedScene scene, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        new(
            scene.SceneId,
            scene.ScenarioId,
            scene.ScenarioTitle,
            scene.Title,
            scene.StartedAt,
            scene.FinishedAt,
            PresentInvestigators.Resolve(scene.InvestigatorsPresent, approved).Select(investigator => new InvestigatorPresentView(investigator.Id, investigator.Name)).ToList(),
            scene.Reveals.Select(reveal => RevealProjection.ForKeeper(reveal, approved)).OrderByDescending(reveal => reveal.Reveal.RevealedAt).ThenBy(reveal => reveal.Reveal.RevealId).ToList());

    public static PlayerHistorySceneView ForPlayer(PlayedScene scene, Guid? ownInvestigatorId) =>
        new(
            scene.SceneId,
            scene.ScenarioTitle,
            scene.Title,
            scene.StartedAt,
            scene.FinishedAt,
            ownInvestigatorId is null
                ? []
                : scene.Reveals
                    .Where(reveal => reveal.RecipientIds.Contains(ownInvestigatorId.Value))
                    .Select(RevealProjection.ForPlayer)
                    .OrderByDescending(reveal => reveal.RevealedAt)
                    .ThenBy(reveal => reveal.RevealId)
                    .ToList());
}
