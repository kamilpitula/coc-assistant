namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Renumbers a Scenario's Scenes to a requested order (ADR 0014). All or nothing: a refused request changes no position.
/// Kept beside <see cref="ScenarioOrder"/> rather than generalized, so Position stays writable only here (design record, D7).
/// </summary>
public static class SceneOrder
{
    /// <summary>
    /// Moves every Scene, whatever its status, to its 1-based index in <paramref name="requested"/> only when the
    /// request lists each current Scene exactly once; otherwise leaves every position untouched.
    /// </summary>
    public static SceneOrderOutcome Apply(IReadOnlyList<Scene> current, IReadOnlyList<Guid> requested)
    {
        if (requested.Distinct().Count() != requested.Count)
        {
            return SceneOrderOutcome.DuplicateIds;
        }

        var byId = current.ToDictionary(scene => scene.Id);
        if (byId.Count != requested.Count || !requested.All(byId.ContainsKey))
        {
            return SceneOrderOutcome.DoesNotMatchScenes;
        }

        for (var index = 0; index < requested.Count; index++)
        {
            byId[requested[index]].MoveTo(index + 1);
        }

        return SceneOrderOutcome.Reordered;
    }
}
