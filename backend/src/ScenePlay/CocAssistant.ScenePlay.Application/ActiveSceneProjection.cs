namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects a Scene by who asks: the Keeper sees everything Scene Play knows, a present Player sees names with their own marked,
/// and any other Player sees only the title and the Reveals that reached their own Investigator (specs/scene-play/spec.md, API
/// Contracts). A Player view never carries an Investigator id.
/// </summary>
internal static class ActiveSceneProjection
{
    public static KeeperActiveSceneView ForKeeper(PlayableScene scene, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        new(
            scene.SceneId,
            scene.ScenarioId,
            scene.ScenarioTitle,
            scene.Title,
            scene.Location,
            scene.StartedAt,
            PresentInvestigators.Resolve(scene.InvestigatorsPresent, approved).Select(investigator => new InvestigatorPresentView(investigator.Id, investigator.Name)).ToList(),
            scene.Reveals.Select(reveal => RevealProjection.ForKeeper(reveal, approved)).OrderByDescending(reveal => reveal.Reveal.RevealedAt).ThenBy(reveal => reveal.Reveal.RevealId).ToList());

    public static ActiveSceneRead ForPlayer(PlayableScene scene, IReadOnlyList<ApprovedInvestigatorRef> approved, Guid playerAccountId)
    {
        var present = PresentInvestigators.Resolve(scene.InvestigatorsPresent, approved);
        var own = present.FirstOrDefault(investigator => investigator.PlayerAccountId == playerAccountId);
        if (own is null)
        {
            return new AbsentPlayerActiveSceneRead(scene.Title);
        }

        var reveals = scene.Reveals
            .Where(reveal => reveal.RecipientIds.Contains(own.Id))
            .Select(RevealProjection.ForPlayer)
            .OrderByDescending(reveal => reveal.RevealedAt)
            .ThenBy(reveal => reveal.RevealId)
            .ToList();

        var names = present
            .Select(investigator => new PlayerInvestigatorPresentView(investigator.Name, investigator.PlayerAccountId == playerAccountId))
            .ToList();
        return new PresentPlayerActiveSceneRead(new PresentPlayerActiveSceneView(scene.Title, scene.Location, names, reveals));
    }
}
