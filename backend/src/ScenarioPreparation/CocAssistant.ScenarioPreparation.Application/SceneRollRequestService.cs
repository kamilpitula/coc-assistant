namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// The provider side of Scene Play's Roll Request port (ADR 0024, ADR 0032): creates Roll Requests on the Active Scene,
/// reads them back, and rolls their Requested Rolls with the server's dice. It performs no authorization; Scene Play checks
/// the Keeper and the Player before it calls (ADR 0024), and no Scenario Preparation endpoint calls it. A refused write
/// changes nothing, and a lost race is reported, never retried (ADR 0025).
/// </summary>
public class SceneRollRequestService
{
    private readonly ISceneRepository _scenes;
    private readonly ISceneRollRequestRepository _requests;
    private readonly IDiceRoller _diceRoller;
    private readonly TimeProvider _timeProvider;

    public SceneRollRequestService(
        ISceneRepository scenes,
        ISceneRollRequestRepository requests,
        IDiceRoller diceRoller,
        TimeProvider timeProvider)
    {
        _scenes = scenes;
        _requests = requests;
        _diceRoller = diceRoller;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Creates a Roll Request on the Campaign's Active Scene. Checks run in this order: an Active Scene, then the domain's
    /// target, Investigator, dice, Luck, and message checks against the Investigators present.
    /// </summary>
    public async Task<RollRequestWriteResult> CreateAsync(
        Guid campaignId,
        RollTarget target,
        string? message,
        RollRequestVisibility visibility,
        Difficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRollInput> investigators,
        CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return Refused(RollRequestWriteOutcome.NoActiveScene);
        }

        var creation = RollRequest.Create(
            campaignId,
            active.Id,
            target,
            message,
            visibility,
            difficulty,
            bonusDice,
            penaltyDice,
            investigators,
            active.InvestigatorsPresent,
            _timeProvider.GetUtcNow());
        if (creation.Outcome != RollRequestCreationOutcome.Created)
        {
            return Refused(ToWriteOutcome(creation.Outcome));
        }

        _requests.Add(creation.Request!);
        return await TrySaveAsync(cancellationToken)
            ? new RollRequestWriteResult(RollRequestWriteOutcome.Created, ToView(creation.Request!))
            : Refused(RollRequestWriteOutcome.Conflict);
    }

    /// <summary>A Roll Request of the Campaign; null when it is not in the Campaign.</summary>
    public async Task<RollRequestView?> FindAsync(Guid campaignId, Guid requestId, CancellationToken cancellationToken)
    {
        var request = await _requests.FindAsync(campaignId, requestId, cancellationToken);
        return request is null ? null : ToView(request);
    }

    /// <summary>The Active Scene's Roll Requests, oldest first; an empty list when no Scene is Active.</summary>
    public async Task<IReadOnlyList<RollRequestView>> ListForActiveSceneAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return [];
        }

        var requests = await _requests.ListForSceneAsync(campaignId, active.Id, cancellationToken);
        return requests.Select(ToView).ToList();
    }

    /// <summary>
    /// The Investigator's Waiting Requested Rolls in the Active Scene, oldest first, each with its Roll Request's target,
    /// message, and creation time; an empty list when no Scene is Active.
    /// </summary>
    public async Task<IReadOnlyList<WaitingRequestedRollView>> ListWaitingForInvestigatorAsync(
        Guid campaignId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null)
        {
            return [];
        }

        var requests = await _requests.ListForSceneAsync(campaignId, active.Id, cancellationToken);
        return requests
            .SelectMany(request => request.RequestedRolls
                .Where(roll => roll.InvestigatorId == investigatorId && roll.Status == RequestedRollStatus.Waiting)
                .Select(roll => new WaitingRequestedRollView(request.Id, request.Target, request.Message, request.CreatedAt, ToView(roll))))
            .ToList();
    }

    /// <summary>
    /// Rolls the Investigator's Requested Roll with the server's dice. Only a roll of the Active Scene can roll; a lost
    /// race reports the roll as already waited on, never retried (ADR 0032).
    /// </summary>
    public async Task<RequestedRollWriteResult> RollAsync(
        Guid campaignId,
        Guid requestId,
        Guid investigatorId,
        Guid rollerAccountId,
        CancellationToken cancellationToken)
    {
        var request = await _requests.FindAsync(campaignId, requestId, cancellationToken);
        if (request is null)
        {
            return new RequestedRollWriteResult(RequestedRollWriteOutcome.NotFound, null);
        }

        var active = await _scenes.FindActiveAsync(campaignId, cancellationToken);
        if (active is null || active.Id != request.SceneId)
        {
            return new RequestedRollWriteResult(RequestedRollWriteOutcome.SceneNotActive, null);
        }

        var result = request.RollInvestigatorRoll(_diceRoller, investigatorId, rollerAccountId, _timeProvider.GetUtcNow());
        if (result.Outcome != RequestedRollOutcome.Rolled)
        {
            return new RequestedRollWriteResult(ToRollOutcome(result.Outcome), null);
        }

        return await TrySaveAsync(cancellationToken)
            ? new RequestedRollWriteResult(RequestedRollWriteOutcome.Rolled, ToView(result.Roll!))
            : new RequestedRollWriteResult(RequestedRollWriteOutcome.NotWaiting, null);
    }

    private async Task<bool> TrySaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _requests.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (RollRequestConcurrencyException)
        {
            return false;
        }
    }

    private static RollRequestView ToView(RollRequest request) =>
        new(
            request.Id,
            request.CampaignId,
            request.SceneId,
            request.Target,
            request.Message,
            request.Visibility,
            request.Difficulty,
            request.BonusDice,
            request.PenaltyDice,
            request.CreatedAt,
            request.RequestedRolls.Select(ToView).ToList());

    private static RequestedRollView ToView(RequestedRoll roll) =>
        new(
            roll.RollRequestId,
            roll.InvestigatorId,
            roll.TargetValue,
            roll.UsesBaseValue,
            roll.CanEarnExperienceCheck,
            roll.Difficulty,
            roll.BonusDice,
            roll.PenaltyDice,
            roll.Status,
            roll.RollRecords);

    private static RollRequestWriteResult Refused(RollRequestWriteOutcome outcome) => new(outcome, null);

    private static RollRequestWriteOutcome ToWriteOutcome(RollRequestCreationOutcome outcome) => outcome switch
    {
        RollRequestCreationOutcome.EmptyInvestigators => RollRequestWriteOutcome.EmptyInvestigators,
        RollRequestCreationOutcome.DuplicateInvestigator => RollRequestWriteOutcome.DuplicateInvestigator,
        RollRequestCreationOutcome.InvestigatorNotPresent => RollRequestWriteOutcome.InvestigatorNotPresent,
        RollRequestCreationOutcome.InvalidTarget => RollRequestWriteOutcome.InvalidTarget,
        RollRequestCreationOutcome.InvalidLuckTarget => RollRequestWriteOutcome.InvalidLuckTarget,
        RollRequestCreationOutcome.InvalidDice => RollRequestWriteOutcome.InvalidDice,
        RollRequestCreationOutcome.MessageTooLong => RollRequestWriteOutcome.MessageTooLong,
        _ => RollRequestWriteOutcome.InvalidTarget,
    };

    private static RequestedRollWriteOutcome ToRollOutcome(RequestedRollOutcome outcome) => outcome switch
    {
        RequestedRollOutcome.InvestigatorNotRequested => RequestedRollWriteOutcome.InvestigatorNotRequested,
        _ => RequestedRollWriteOutcome.NotWaiting,
    };
}
