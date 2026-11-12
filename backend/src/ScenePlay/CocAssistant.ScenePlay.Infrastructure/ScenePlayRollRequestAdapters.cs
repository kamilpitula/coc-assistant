namespace CocAssistant.ScenePlay.Infrastructure;

/// <summary>
/// Adapts Scenario Preparation's <see cref="CocAssistant.ScenarioPreparation.Application.SceneRollRequestService"/> to Scene Play's
/// Roll Request port (ADR 0024, ADR 0032; PBI-DICE-005 D1). Target kinds, visibilities, difficulties, statuses, and outcomes carry
/// the same names on both sides, so they map by name; a test proves every member maps.
/// </summary>
public sealed class ScenarioPreparationRollRequests : IRollRequests
{
    private readonly CocAssistant.ScenarioPreparation.Application.SceneRollRequestService _requests;

    public ScenarioPreparationRollRequests(CocAssistant.ScenarioPreparation.Application.SceneRollRequestService requests)
    {
        _requests = requests;
    }

    public async Task<RollRequestRecord?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken)
    {
        var request = await _requests.FindAsync(campaignId, requestId, cancellationToken);
        return request is null ? null : ToRecord(request);
    }

    public async Task<IReadOnlyList<RollRequestRecord>> ListForActiveSceneAsync(Guid campaignId, CancellationToken cancellationToken) =>
        (await _requests.ListForActiveSceneAsync(campaignId, cancellationToken)).Select(ToRecord).ToList();

    public async Task<IReadOnlyList<WaitingRequestedRollRecord>> ListWaitingForInvestigatorAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken) =>
        (await _requests.ListWaitingForInvestigatorAsync(campaignId, investigatorId, cancellationToken))
            .Select(waiting => new WaitingRequestedRollRecord(waiting.RollRequestId, ToInput(waiting.Target), waiting.Message, ToRecord(waiting.Roll)))
            .ToList();

    public async Task<RollRequestWriteResult> CreateAsync(
        Guid campaignId,
        RollRequestTargetInput target,
        string? message,
        RollRequestVisibility visibility,
        RollRequestDifficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRollValueInput> investigators,
        CancellationToken cancellationToken)
    {
        var result = await _requests.CreateAsync(
            campaignId,
            ToTarget(target),
            message,
            ScenarioPreparationPlayableScenes.Map<CocAssistant.ScenarioPreparation.Domain.RollRequests.RollRequestVisibility>(visibility),
            ScenarioPreparationPlayableScenes.Map<CocAssistant.GameRules.Domain.Dice.Difficulty>(difficulty),
            bonusDice,
            penaltyDice,
            investigators.Select(ToProviderInput).ToList(),
            cancellationToken);
        return new RollRequestWriteResult(ScenarioPreparationPlayableScenes.Map<RollRequestWriteOutcome>(result.Outcome), result.Request is null ? null : ToRecord(result.Request));
    }

    public async Task<RequestedRollWriteResult> RollAsync(Guid campaignId, Guid requestId, Guid investigatorId, Guid rollerAccountId, CancellationToken cancellationToken)
    {
        var result = await _requests.RollAsync(campaignId, requestId, investigatorId, rollerAccountId, cancellationToken);
        return new RequestedRollWriteResult(ScenarioPreparationPlayableScenes.Map<RequestedRollWriteOutcome>(result.Outcome), result.Roll is null ? null : ToRecord(result.Roll));
    }

    internal static RollRequestRecord ToRecord(CocAssistant.ScenarioPreparation.Application.RollRequestView request) =>
        new RollRequestRecord(
                request.Id,
                request.CampaignId,
                request.SceneId,
                ToInput(request.Target),
                request.Message,
                ScenarioPreparationPlayableScenes.Map<RollRequestVisibility>(request.Visibility),
                ScenarioPreparationPlayableScenes.Map<RollRequestDifficulty>(request.Difficulty),
                request.BonusDice,
                request.PenaltyDice,
                request.CreatedAt,
                request.RequestedRolls.Select(ToRecord).ToList());

    internal static RequestedRollRecord ToRecord(CocAssistant.ScenarioPreparation.Application.RequestedRollView roll) =>
        new(
            roll.RollRequestId,
            roll.InvestigatorId,
            roll.TargetValue,
            roll.UsesBaseValue,
            roll.CanEarnExperienceCheck,
            ScenarioPreparationPlayableScenes.Map<RollRequestDifficulty>(roll.Difficulty),
            roll.BonusDice,
            roll.PenaltyDice,
            ScenarioPreparationPlayableScenes.Map<RequestedRollStatus>(roll.Status),
            roll.RollRecords.Select(ToRecord).ToList());

    internal static StoredRollRecord ToRecord(CocAssistant.GameRules.Domain.Dice.RollRecord record) =>
        new(
            record.Dice,
            record.Result,
            record.Faces,
            record.RolledByAccountId,
            record.RolledAt,
            record.Percentile is null
                ? null
                : new PercentileOutcomeData(
                    record.Percentile.UnitsFace,
                    record.Percentile.TensFaces,
                    record.Percentile.KeptTens,
                    record.Percentile.Result,
                    ScenarioPreparationPlayableScenes.Map<RollSuccessLevel>(record.Percentile.SuccessLevel),
                    record.Percentile.IsSuccess),
            record.EarnsExperienceCheck);

    private static RollRequestTargetInput ToInput(CocAssistant.ScenarioPreparation.Domain.RollRequests.RollTarget target) =>
        new(
            ScenarioPreparationPlayableScenes.Map<RollRequestTargetKind>(target.Kind),
            target.Skill,
            target.Specialization,
            target.Characteristic?.ToCode());

    private static CocAssistant.ScenarioPreparation.Domain.RollRequests.RollTarget ToTarget(RollRequestTargetInput target) =>
        new(
            ScenarioPreparationPlayableScenes.Map<CocAssistant.ScenarioPreparation.Domain.RollRequests.RollTargetKind>(target.Kind),
            target.Skill,
            target.Specialization,
            string.IsNullOrWhiteSpace(target.Characteristic) || target.Kind != RollRequestTargetKind.Characteristic
                ? null
                : CharacteristicCodes.TryParse(target.Characteristic, out var characteristic)
                    ? characteristic
                    : throw new InvalidOperationException("The Characteristic code was refused by the target values before the provider call."));

    private static CocAssistant.ScenarioPreparation.Domain.RollRequests.RequestedRollInput ToProviderInput(RequestedRollValueInput input) =>
        new(
            input.InvestigatorId,
            input.TargetValue,
            input.UsesBaseValue,
            input.CanEarnExperienceCheck,
            input.Difficulty is null ? null : ScenarioPreparationPlayableScenes.Map<CocAssistant.GameRules.Domain.Dice.Difficulty>(input.Difficulty),
            input.BonusDice,
            input.PenaltyDice);
}

/// <summary>
/// Adapts Campaign Play's <see cref="CocAssistant.CampaignPlay.Application.InvestigatorTargetValueQuery"/> to Scene Play's
/// target-value port (ADR 0024). Target refusals carry the same names on both sides, so they map by name; a test proves
/// every member maps. No authorization: the caller already checked the Keeper.
/// </summary>
public sealed class CampaignPlayInvestigatorTargetValues : IInvestigatorTargetValues
{
    private readonly CocAssistant.CampaignPlay.Application.ICampaignRepository _campaigns;
    private readonly CocAssistant.CampaignPlay.Application.InvestigatorTargetValueQuery _values;

    public CampaignPlayInvestigatorTargetValues(
        CocAssistant.CampaignPlay.Application.ICampaignRepository campaigns,
        CocAssistant.CampaignPlay.Application.InvestigatorTargetValueQuery values)
    {
        _campaigns = campaigns;
        _values = values;
    }

    public async Task<TargetValueResult?> QueryAsync(
        Guid campaignId,
        RollRequestTargetInput target,
        IReadOnlyList<Guid> investigatorIds,
        CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null)
        {
            return null;
        }

        var providerTarget = ToProviderTarget(target);
        if (providerTarget is null)
        {
            return new TargetValueResult(TargetValueRefusal.UnknownTarget, []);
        }

        var result = await _values.QueryAsync(campaign, providerTarget, investigatorIds, cancellationToken);
        return new TargetValueResult(
            result.Refusal is null ? null : ScenarioPreparationPlayableScenes.Map<TargetValueRefusal>(result.Refusal),
            result.Values.Select(value => new InvestigatorTargetValue(value.InvestigatorId, value.Value, value.UsesBaseValue, value.CanEarnExperienceCheck)).ToList());
    }

    private static CocAssistant.CampaignPlay.Application.RollRequestTarget? ToProviderTarget(RollRequestTargetInput target) =>
        target.Kind switch
        {
            RollRequestTargetKind.Skill when !string.IsNullOrWhiteSpace(target.Skill) => new(
                CocAssistant.CampaignPlay.Application.RollTargetKind.Skill,
                new CocAssistant.CampaignPlay.Domain.CharacterSheets.SkillReference(target.Skill, target.Specialization)),
            RollRequestTargetKind.Characteristic when CharacteristicCodes.TryParse(target.Characteristic, out var characteristic) => new(
                CocAssistant.CampaignPlay.Application.RollTargetKind.Characteristic,
                Characteristic: characteristic),
            RollRequestTargetKind.Luck => new(CocAssistant.CampaignPlay.Application.RollTargetKind.Luck),
            _ => null,
        };
}

/// <summary>Publishes the roll request change through Campaign Play's publisher, which uses the publication policy (ADR 0009, ADR 0024).</summary>
public sealed class CampaignPlayRollRequestSignals : IRollRequestSignals
{
    private readonly CocAssistant.CampaignPlay.Application.PublishRollRequestChanged _publisher;

    public CampaignPlayRollRequestSignals(CocAssistant.CampaignPlay.Application.PublishRollRequestChanged publisher)
    {
        _publisher = publisher;
    }

    public Task RollRequestChangedAsync(Guid campaignId, RollRequestVisibility visibility, IReadOnlyCollection<Guid> playerAccountIds, CancellationToken cancellationToken) =>
        _publisher.PublishAsync(
            campaignId,
            ScenarioPreparationPlayableScenes.Map<CocAssistant.CampaignPlay.Domain.Wall.WallEntryVisibility>(visibility),
            playerAccountIds,
            cancellationToken);
}

/// <summary>Reads Account display names through Campaign Play's port, which never stores a copy of a name.</summary>
public sealed class CampaignPlayAccountNames : IAccountNames
{
    private readonly CocAssistant.CampaignPlay.Application.IAccountDisplayNames _names;

    public CampaignPlayAccountNames(CocAssistant.CampaignPlay.Application.IAccountDisplayNames names)
    {
        _names = names;
    }

    public Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(IReadOnlyCollection<Guid> accountIds, CancellationToken cancellationToken) =>
        _names.GetDisplayNamesAsync(accountIds, cancellationToken);
}
