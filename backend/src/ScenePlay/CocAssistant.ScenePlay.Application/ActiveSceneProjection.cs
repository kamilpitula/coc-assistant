namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects a Scene by who asks: the Keeper sees everything Scene Play knows, a present Player sees names with their own marked,
/// and any other Player sees only the title (specs/scene-play/spec.md, API Contracts). A Player view never carries an Investigator id.
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
            Present(scene, approved).Select(investigator => new InvestigatorPresentView(investigator.Id, investigator.Name)).ToList());

    public static ActiveSceneRead ForPlayer(PlayableScene scene, IReadOnlyList<ApprovedInvestigatorRef> approved, Guid playerAccountId)
    {
        var present = Present(scene, approved);
        if (!present.Any(investigator => investigator.PlayerAccountId == playerAccountId))
        {
            return new AbsentPlayerActiveSceneRead(scene.Title);
        }

        var names = present
            .Select(investigator => new PlayerInvestigatorPresentView(investigator.Name, investigator.PlayerAccountId == playerAccountId))
            .ToList();
        return new PresentPlayerActiveSceneRead(new PresentPlayerActiveSceneView(scene.Title, scene.Location, names));
    }

    // Present ids with their Approved record when there is one, by name then id, so every view lists them in one order.
    private static List<PresentInvestigator> Present(PlayableScene scene, IReadOnlyList<ApprovedInvestigatorRef> approved) =>
        scene.InvestigatorsPresent
            .Select(id => approved.FirstOrDefault(candidate => candidate.InvestigatorId == id) is { } match
                ? new PresentInvestigator(id, match.PlayerAccountId, match.Name)
                : new PresentInvestigator(id, null, null))
            .OrderBy(investigator => investigator.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(investigator => investigator.Id)
            .ToList();

    private sealed record PresentInvestigator(Guid Id, Guid? PlayerAccountId, string? Name);
}
