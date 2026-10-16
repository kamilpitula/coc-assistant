namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Renumbers a Campaign's Scenarios to a requested order (ADR 0014). All or nothing: a refused request changes no position.</summary>
public static class ScenarioOrder
{
    /// <summary>
    /// Moves every Scenario to its 1-based index in <paramref name="requested"/> only when the request lists
    /// each current Scenario exactly once; otherwise leaves every position untouched.
    /// </summary>
    public static ScenarioOrderOutcome Apply(IReadOnlyList<Scenario> current, IReadOnlyList<Guid> requested)
    {
        if (requested.Distinct().Count() != requested.Count)
        {
            return ScenarioOrderOutcome.DuplicateIds;
        }

        var byId = current.ToDictionary(scenario => scenario.Id);
        if (byId.Count != requested.Count || !requested.All(byId.ContainsKey))
        {
            return ScenarioOrderOutcome.DoesNotMatchScenarios;
        }

        for (var index = 0; index < requested.Count; index++)
        {
            byId[requested[index]].MoveTo(index + 1);
        }

        return ScenarioOrderOutcome.Reordered;
    }
}
