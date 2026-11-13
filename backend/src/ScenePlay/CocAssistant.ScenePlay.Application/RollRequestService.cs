namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Requests rolls in the Active Scene and rolls them (specs/roll-requests/spec.md; PBI-DICE-005 D4, D5).
/// The Keeper check runs first on a create, so a Player or non-member gets NotFound before any Scene, value, provider,
/// Wall, or live port is touched. After a write commits, the Wall Entry and the live signal follow; a failure of either
/// is logged and never fails the request (ADR 0024).
/// </summary>
public class RollRequestService
{
    private readonly ICampaignRoles _roles;
    private readonly IPlayableScenes _scenes;
    private readonly IApprovedInvestigators _approved;
    private readonly IRollRequests _requests;
    private readonly IInvestigatorTargetValues _values;
    private readonly ISceneWallEntries _wall;
    private readonly IRollRequestSignals _signals;
    private readonly IAccountNames _names;
    private readonly ILogger<RollRequestService> _logger;

    public RollRequestService(
        ICampaignRoles roles,
        IPlayableScenes scenes,
        IApprovedInvestigators approved,
        IRollRequests requests,
        IInvestigatorTargetValues values,
        ISceneWallEntries wall,
        IRollRequestSignals signals,
        IAccountNames names,
        ILogger<RollRequestService> logger)
    {
        _roles = roles;
        _scenes = scenes;
        _approved = approved;
        _requests = requests;
        _values = values;
        _wall = wall;
        _signals = signals;
        _names = names;
        _logger = logger;
    }

    /// <summary>Requests rolls of the Active Scene; the snapshot values come from the Approved Character Sheets.</summary>
    public async Task<CreateRollRequestResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        RollRequestTargetInput target,
        string? message,
        RollRequestVisibility visibility,
        RollRequestDifficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRollCreateInput> investigators,
        CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.NotFound, null);
        }

        if (await _scenes.FindActiveAsync(campaignId, cancellationToken) is null)
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.NoActiveScene, null);
        }

        var shape = CheckShape(target, visibility, difficulty, investigators);
        if (shape is not null)
        {
            return shape;
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var values = await _values.QueryAsync(
            campaignId, target, investigators.Select(investigator => investigator.InvestigatorId).ToList(), cancellationToken);
        if (values is null)
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.NotFound, null);
        }

        if (values.Refusal is not null)
        {
            return new CreateRollRequestResult(Enum.Parse<CreateRollRequestOutcome>(values.Refusal.Value.ToString()), null);
        }

        var result = await _requests.CreateAsync(
            campaignId, target, message, visibility, difficulty, bonusDice, penaltyDice,
            ValueInputs(investigators, values.Values), callerAccountId, cancellationToken);
        if (result.Outcome != RollRequestWriteOutcome.Created)
        {
            return new CreateRollRequestResult(Enum.Parse<CreateRollRequestOutcome>(result.Outcome.ToString()), null);
        }

        await TryAddWallEntryAsync(campaignId, callerAccountId, result.Request!.Id, visibility, cancellationToken);
        await TrySignalAsync(campaignId, visibility, AffectedAccounts(approved, investigators), cancellationToken);
        return new CreateRollRequestResult(CreateRollRequestOutcome.Created, await ProjectAsync(result.Request, approved, cancellationToken));
    }

    /// <summary>A Roll Request as the caller may see it; null when the Campaign is missing, the caller is not a member, the request is missing, or a Player asks for a KeeperOnly request.</summary>
    public async Task<RollRequestView?> FindAsync(Guid campaignId, Guid callerAccountId, Guid requestId, CancellationToken cancellationToken)
    {
        var role = await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken);
        if (role is null)
        {
            return null;
        }

        var request = await _requests.FindAsync(campaignId, requestId, cancellationToken);
        if (request is null || (request.Visibility != RollRequestVisibility.Public && role != CampaignMemberRole.Keeper))
        {
            return null;
        }

        return await ProjectAsync(request, await _approved.ListAsync(campaignId, cancellationToken), cancellationToken);
    }

    /// <summary>The Active Scene's Roll Requests, oldest first, as the Keeper sees them; null for anyone else. An empty list when no Scene is Active.</summary>
    public async Task<IReadOnlyList<RollRequestView>?> ListForActiveSceneAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Keeper)
        {
            return null;
        }

        var requests = await _requests.ListForActiveSceneAsync(campaignId, cancellationToken);
        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var names = await RollerNamesAsync(requests.SelectMany(request => request.RequestedRolls), cancellationToken);
        return requests.Select(request => RollRequestProjection.ForView(request, approved, names)).ToList();
    }

    /// <summary>The caller's Waiting Requested Rolls in the Active Scene; null when the caller is not a Player or has no Approved Investigator.</summary>
    public async Task<WaitingRollsResult?> ListMineAsync(Guid campaignId, Guid callerAccountId, CancellationToken cancellationToken)
    {
        if (await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken) != CampaignMemberRole.Player)
        {
            return null;
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var mine = approved.FirstOrDefault(investigator => investigator.PlayerAccountId == callerAccountId);
        if (mine is null)
        {
            return null;
        }

        var waiting = await _requests.ListWaitingForInvestigatorAsync(campaignId, mine.InvestigatorId, cancellationToken);
        var names = await RollerNamesAsync(waiting.Select(item => item.Roll), cancellationToken);
        return new WaitingRollsResult(mine.Name, waiting.Select(item => RollRequestProjection.ForWaiting(item, approved, names)).ToList());
    }

    /// <summary>Rolls the Investigator's Requested Roll; a Player may roll only their own Investigator's.</summary>
    public async Task<RollRequestedRollResult> RollAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid requestId,
        Guid investigatorId,
        CancellationToken cancellationToken)
    {
        var role = await _roles.RoleOfAsync(campaignId, callerAccountId, cancellationToken);
        if (role is null)
        {
            return new RollRequestedRollResult(RollRequestedRollOutcome.NotFound, null);
        }

        var approved = await _approved.ListAsync(campaignId, cancellationToken);
        var owner = approved.FirstOrDefault(investigator => investigator.InvestigatorId == investigatorId);
        if (role != CampaignMemberRole.Keeper && (owner is null || owner.PlayerAccountId != callerAccountId))
        {
            return new RollRequestedRollResult(RollRequestedRollOutcome.NotFound, null);
        }

        var result = await _requests.RollAsync(campaignId, requestId, investigatorId, callerAccountId, cancellationToken);
        return result.Outcome switch
        {
            RequestedRollWriteOutcome.Rolled => await RolledAsync(campaignId, owner, result.Roll!, approved, cancellationToken),
            RequestedRollWriteOutcome.SceneNotActive => new RollRequestedRollResult(RollRequestedRollOutcome.SceneNotActive, null),
            RequestedRollWriteOutcome.NotWaiting => new RollRequestedRollResult(RollRequestedRollOutcome.NotWaiting, null),
            _ => new RollRequestedRollResult(RollRequestedRollOutcome.NotFound, null),
        };
    }

    private async Task<RollRequestedRollResult> RolledAsync(
        Guid campaignId,
        ApprovedInvestigatorRef? owner,
        RequestedRollRecord roll,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        CancellationToken cancellationToken)
    {
        var affected = owner is null ? [] : (IReadOnlyCollection<Guid>)[owner.PlayerAccountId];
        await TrySignalAsync(campaignId, RollRequestVisibility.Public, affected, cancellationToken);
        var names = await RollerNamesAsync([roll], cancellationToken);
        return new RollRequestedRollResult(
            RollRequestedRollOutcome.Rolled,
            RollRequestProjection.ForRoll(roll, owner?.Name ?? approved.FirstOrDefault(candidate => candidate.InvestigatorId == roll.InvestigatorId)?.Name, names));
    }

    private async Task<RollRequestView> ProjectAsync(
        RollRequestRecord request,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        CancellationToken cancellationToken) =>
        RollRequestProjection.ForView(request, approved, await RollerNamesAsync(request.RequestedRolls, cancellationToken));

    private async Task<IReadOnlyDictionary<Guid, string>> RollerNamesAsync(
        IEnumerable<RequestedRollRecord> rolls,
        CancellationToken cancellationToken)
    {
        var ids = rolls
            .SelectMany(roll => roll.RollRecords)
            .Select(record => record.RolledByAccountId)
            .OfType<Guid>()
            .Distinct()
            .ToList();
        return ids.Count == 0
            ? new Dictionary<Guid, string>()
            : await _names.GetDisplayNamesAsync(ids, cancellationToken);
    }

    private static List<Guid> AffectedAccounts(
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        IReadOnlyList<RequestedRollCreateInput> investigators) =>
        approved
            .Where(investigator => investigators.Any(input => input.InvestigatorId == investigator.InvestigatorId))
            .Select(investigator => investigator.PlayerAccountId)
            .Distinct()
            .ToList();

    private static IReadOnlyList<RequestedRollValueInput> ValueInputs(
        IReadOnlyList<RequestedRollCreateInput> investigators,
        IReadOnlyList<InvestigatorTargetValue> values) =>
        investigators
            .Select(input => ValueInput(input, values.First(value => value.InvestigatorId == input.InvestigatorId)))
            .ToList();

    private static RequestedRollValueInput ValueInput(RequestedRollCreateInput input, InvestigatorTargetValue value) =>
        new(value.InvestigatorId, value.Value, value.UsesBaseValue, value.CanEarnExperienceCheck, input.Difficulty, input.BonusDice, input.PenaltyDice);

    private static CreateRollRequestResult? CheckShape(
        RollRequestTargetInput target,
        RollRequestVisibility visibility,
        RollRequestDifficulty difficulty,
        IReadOnlyList<RequestedRollCreateInput> investigators)
    {
        if (!IsTarget(target))
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.InvalidTarget, null);
        }

        if (difficulty == RollRequestDifficulty.Unknown || investigators.Any(investigator => investigator.Difficulty == RollRequestDifficulty.Unknown))
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.InvalidDifficulty, null);
        }

        if (visibility == RollRequestVisibility.KeeperOnly)
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.KeeperOnlyNotAvailable, null);
        }

        if (visibility == RollRequestVisibility.Unknown)
        {
            return new CreateRollRequestResult(CreateRollRequestOutcome.InvalidVisibility, null);
        }

        return null;
    }

    private static bool IsTarget(RollRequestTargetInput target) =>
        target.Kind switch
        {
            RollRequestTargetKind.Skill => !string.IsNullOrWhiteSpace(target.Skill),
            RollRequestTargetKind.Characteristic => !string.IsNullOrWhiteSpace(target.Characteristic),
            RollRequestTargetKind.Luck => true,
            _ => false,
        };

    private async Task TryAddWallEntryAsync(
        Guid campaignId,
        Guid keeperAccountId,
        Guid rollRequestId,
        RollRequestVisibility visibility,
        CancellationToken cancellationToken)
    {
        try
        {
            await _wall.AddRollRequestAsync(campaignId, keeperAccountId, rollRequestId, visibility, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The Wall Entry for a Roll Request in Campaign {CampaignId} could not be created.", campaignId);
        }
    }

    private async Task TrySignalAsync(
        Guid campaignId,
        RollRequestVisibility visibility,
        IReadOnlyCollection<Guid> playerAccountIds,
        CancellationToken cancellationToken)
    {
        try
        {
            await _signals.RollRequestChangedAsync(campaignId, visibility, playerAccountIds, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "The roll request signal for Campaign {CampaignId} could not be published.", campaignId);
        }
    }
}
