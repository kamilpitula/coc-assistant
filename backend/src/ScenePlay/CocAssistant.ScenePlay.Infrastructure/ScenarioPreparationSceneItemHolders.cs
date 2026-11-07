namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.ItemHolderCommandService"/> to Scene Play's
/// holder port (ADR 0024, PBI-SPL-003 D1). Outcomes carry the same names on both sides, so they map by name; a service test proves
/// every provider outcome has a service outcome of the same name.
/// </summary>
public sealed class ScenarioPreparationSceneItemHolders : ISceneItemHolders
{
    private readonly CocAssistant.ScenarioPreparation.Application.ItemHolderCommandService _holders;

    public ScenarioPreparationSceneItemHolders(CocAssistant.ScenarioPreparation.Application.ItemHolderCommandService holders)
    {
        _holders = holders;
    }

    public async Task<ItemGiveRecordResult> GiveAsync(Guid campaignId, Guid itemId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var result = await _holders.GiveAsync(campaignId, itemId, investigatorId, cancellationToken);
        return new ItemGiveRecordResult(
            ScenarioPreparationPlayableScenes.Map<ItemGiveOutcome>(result.Outcome),
            result.Reveal is null ? null : ScenarioPreparationSceneReveals.ToRecord(result.Reveal),
            result.FormerHolderId);
    }

    public async Task<ItemTakeBackRecordResult> TakeBackAsync(Guid campaignId, Guid itemId, CancellationToken cancellationToken)
    {
        var result = await _holders.TakeBackAsync(campaignId, itemId, cancellationToken);
        return new ItemTakeBackRecordResult(ScenarioPreparationPlayableScenes.Map<ItemTakeBackOutcome>(result.Outcome), result.FormerHolderId);
    }

    public async Task<IReadOnlyList<HeldItemRecord>> ListHeldAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken) =>
        (await _holders.ListHeldAsync(campaignId, investigatorId, cancellationToken))
            .Select(held => new HeldItemRecord(held.ItemId, ScenarioPreparationSceneReveals.ToRecord(held.GiveReveal)))
            .ToList();
}
