namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Lists, reads, creates, edits, and reorders a Campaign's Scenarios for its Keeper (specs/scenario-preparation/spec.md).
/// The Keeper check runs first on every operation, so a Player, another Campaign's Keeper, or a missing Campaign
/// all end as NotFound before any Scenario is read or written.
/// </summary>
public class ScenarioService
{
    private readonly ICampaignKeepers _keepers;
    private readonly IScenarioRepository _scenarios;
    private readonly TimeProvider _timeProvider;

    public ScenarioService(ICampaignKeepers keepers, IScenarioRepository scenarios, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _scenarios = scenarios;
        _timeProvider = timeProvider;
    }

    /// <summary>The Campaign's Scenarios in Campaign order; null when the caller is not its Keeper.</summary>
    public async Task<IReadOnlyList<ScenarioView>?> ListAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return null;
        }

        return ToViews(await _scenarios.ListForCampaignAsync(campaignId, cancellationToken));
    }

    /// <summary>One Scenario; null when the caller is not the Keeper or the Scenario is not in this Campaign.</summary>
    public async Task<ScenarioView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid scenarioId, CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return null;
        }

        var scenario = await _scenarios.FindByIdAsync(campaignId, scenarioId, cancellationToken);
        return scenario is null ? null : ToView(scenario);
    }

    /// <summary>Appends a Scenario after the Campaign's existing ones.</summary>
    public async Task<ScenarioWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        string title,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new ScenarioWriteResult(ScenarioWriteOutcome.NotFound, null);
        }

        var position = await _scenarios.MaxPositionAsync(campaignId, cancellationToken) + 1;
        var creation = Scenario.Create(campaignId, title, keeperNotes, position, _timeProvider.GetUtcNow());
        if (creation.Scenario is null)
        {
            return new ScenarioWriteResult(ToWriteOutcome(creation.Outcome), null);
        }

        _scenarios.Add(creation.Scenario);
        await _scenarios.SaveChangesAsync(cancellationToken);
        return new ScenarioWriteResult(ScenarioWriteOutcome.Saved, ToView(creation.Scenario));
    }

    /// <summary>Replaces a Scenario's Title and Keeper notes; its place in the order is unchanged.</summary>
    public async Task<ScenarioWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid scenarioId,
        string title,
        string? keeperNotes,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new ScenarioWriteResult(ScenarioWriteOutcome.NotFound, null);
        }

        var scenario = await _scenarios.FindByIdAsync(campaignId, scenarioId, cancellationToken);
        if (scenario is null)
        {
            return new ScenarioWriteResult(ScenarioWriteOutcome.NotFound, null);
        }

        var outcome = scenario.Edit(title, keeperNotes);
        if (outcome != ScenarioFieldsOutcome.Accepted)
        {
            return new ScenarioWriteResult(ToWriteOutcome(outcome), null);
        }

        await _scenarios.SaveChangesAsync(cancellationToken);
        return new ScenarioWriteResult(ScenarioWriteOutcome.Saved, ToView(scenario));
    }

    /// <summary>
    /// Applies the requested order of every Scenario id in one save (ADR 0014). A request that is not exactly the
    /// Campaign's current set changes nothing.
    /// </summary>
    public async Task<ScenarioReorderResult> ReorderAsync(
        Guid campaignId,
        Guid callerAccountId,
        IReadOnlyList<Guid> scenarioIds,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new ScenarioReorderResult(ScenarioReorderOutcome.NotFound, null);
        }

        var current = await _scenarios.ListTrackedForCampaignAsync(campaignId, cancellationToken);
        var outcome = ScenarioOrder.Apply(current, scenarioIds);
        if (outcome != ScenarioOrderOutcome.Reordered)
        {
            return new ScenarioReorderResult(ToReorderOutcome(outcome), null);
        }

        await _scenarios.SaveChangesAsync(cancellationToken);
        var reordered = current.OrderBy(scenario => scenario.Position).ToList();
        return new ScenarioReorderResult(ScenarioReorderOutcome.Reordered, ToViews(reordered));
    }

    private static ScenarioView ToView(Scenario scenario) => new(scenario.Id, scenario.Title, scenario.KeeperNotes);

    private static IReadOnlyList<ScenarioView> ToViews(IEnumerable<Scenario> scenarios) => scenarios.Select(ToView).ToList();

    private static ScenarioWriteOutcome ToWriteOutcome(ScenarioFieldsOutcome outcome) =>
        outcome == ScenarioFieldsOutcome.InvalidTitle ? ScenarioWriteOutcome.InvalidTitle : ScenarioWriteOutcome.InvalidKeeperNotes;

    private static ScenarioReorderOutcome ToReorderOutcome(ScenarioOrderOutcome outcome) =>
        outcome == ScenarioOrderOutcome.DuplicateIds ? ScenarioReorderOutcome.DuplicateIds : ScenarioReorderOutcome.DoesNotMatchScenarios;
}
