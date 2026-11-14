namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects played Scenes by who asks: the Keeper sees every Reveal with its recipients, the Investigators present, and
/// every Roll Request; a Player sees only the Reveals that reached their own Investigator and the Public Roll Requests
/// (specs/scene-play/spec.md, Scene History; specs/roll-requests/spec.md, Scene History).
/// </summary>
internal static class SceneHistoryProjection
{
    public static KeeperHistorySceneView ForKeeper(
        PlayedScene scene,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(
            scene.SceneId,
            scene.ScenarioId,
            scene.ScenarioTitle,
            scene.Title,
            scene.StartedAt,
            scene.FinishedAt,
            PresentInvestigators.Resolve(scene.InvestigatorsPresent, approved).Select(investigator => new InvestigatorPresentView(investigator.Id, investigator.Name)).ToList(),
            scene.Reveals.Select(reveal => RevealProjection.ForKeeper(reveal, approved)).OrderByDescending(reveal => reveal.Reveal.RevealedAt).ThenBy(reveal => reveal.Reveal.RevealId).ToList(),
            scene.RollRequests.Select(request => RollRequestProjection.ForView(request, approved, rollerNames)).OrderByDescending(request => request.CreatedAt).ThenBy(request => request.Id).ToList());

    public static PlayerHistorySceneView ForPlayer(
        PlayedScene scene,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        Guid? ownInvestigatorId,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
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
                    .ToList(),
            scene.RollRequests
                .Where(request => RollRequestVisibilityRule.IsVisibleTo(request, CampaignMemberRole.Player))
                .Select(request => RollRequestProjection.ForView(request, approved, rollerNames))
                .OrderByDescending(request => request.CreatedAt)
                .ThenBy(request => request.Id)
                .ToList());
}
