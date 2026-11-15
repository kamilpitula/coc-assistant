namespace CocAssistant.ScenePlay.Controllers;

/// <summary>
/// Requesting rolls in the Active Scene and rolling them (specs/roll-requests/spec.md, API Contracts).
/// Campaign members only: non-members and missing Campaigns get 404 on every call, a Player gets 404 on a create and on
/// the Keeper list, and a roll is only for the Investigator's Player or the Keeper.
/// </summary>
[Route("api/campaigns/{campaignId:guid}")]
public class RollRequestsController : ScenePlayControllerBase
{
    private readonly RollRequestService _requests;

    public RollRequestsController(RollRequestService requests, AccountService accountService)
        : base(accountService)
    {
        _requests = requests;
    }

    /// <summary>Requests rolls of the Active Scene for the Investigators present. Returns 201 with the Roll Request as the Keeper sees it.</summary>
    [HttpPost("active-scene/roll-requests")]
    public async Task<ActionResult<RollRequestResponse>> Create(Guid campaignId, CreateRollRequestRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.CreateAsync(
            campaignId,
            accountId.Value,
            ToInput(request.Target),
            request.Message,
            ParseVisibility(request.Visibility),
            ParseDifficulty(request.Difficulty),
            request.BonusDice ?? 0,
            request.PenaltyDice ?? 0,
            (request.Investigators ?? []).Select(ToInput).ToList(),
            cancellationToken);
        return result.Request is not null
            ? CreatedAtAction(nameof(Get), new { campaignId, rollRequestId = result.Request.Id }, RollRequestMapping.ToResponse(result.Request))
            : CreateFailure(result.Outcome);
    }

    /// <summary>The Roll Request as the caller may see it.</summary>
    [HttpGet("roll-requests/{rollRequestId:guid}")]
    public async Task<ActionResult<RollRequestResponse>> Get(Guid campaignId, Guid rollRequestId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var request = await _requests.FindAsync(campaignId, accountId.Value, rollRequestId, cancellationToken);
        return request is null ? NotFound() : Ok(RollRequestMapping.ToResponse(request));
    }

    /// <summary>The Active Scene's Roll Requests, oldest first, as the Keeper sees them. 404 for anyone else, and an empty list when no Scene is Active.</summary>
    [HttpGet("active-scene/roll-requests")]
    public async Task<ActionResult<IReadOnlyList<RollRequestResponse>>> ListForActiveScene(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var requests = await _requests.ListForActiveSceneAsync(campaignId, accountId.Value, cancellationToken);
        return requests is null ? NotFound() : Ok(requests.Select(RollRequestMapping.ToResponse).ToList());
    }

    /// <summary>The calling Player's Waiting Requested Rolls in the Active Scene. 404 for the Keeper and for a Player without an Approved Investigator.</summary>
    [HttpGet("investigators/mine/requested-rolls")]
    public async Task<ActionResult<WaitingRollsResponse>> GetMine(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var mine = await _requests.ListMineAsync(campaignId, accountId.Value, cancellationToken);
        return mine is null ? NotFound() : Ok(RollRequestMapping.ToResponse(mine));
    }

    /// <summary>Rolls the Investigator's Requested Roll with the server's dice and returns it. The Investigator's Player or the Keeper only.</summary>
    [HttpPost("roll-requests/{rollRequestId:guid}/requested-rolls/{investigatorId:guid}/roll")]
    public async Task<ActionResult<RequestedRollResponse>> Roll(Guid campaignId, Guid rollRequestId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.RollAsync(campaignId, accountId.Value, rollRequestId, investigatorId, cancellationToken);
        return result.Roll is not null ? Ok(RollRequestMapping.ToResponse(result.Roll)) : RollFailure(result.Outcome);
    }

    /// <summary>Cancels the Investigator's Waiting Requested Roll and returns it. The Keeper only.</summary>
    [HttpPost("roll-requests/{rollRequestId:guid}/requested-rolls/{investigatorId:guid}/cancel")]
    public async Task<ActionResult<RequestedRollResponse>> Cancel(Guid campaignId, Guid rollRequestId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.CancelAsync(campaignId, accountId.Value, rollRequestId, investigatorId, cancellationToken);
        return result.Roll is not null ? Ok(RollRequestMapping.ToResponse(result.Roll)) : CancelFailure(result.Outcome);
    }

    /// <summary>The calling Player's pushable Requested Rolls in the Active Scene. 404 for the Keeper and for a Player without an Approved Investigator.</summary>
    [HttpGet("investigators/mine/pushable-rolls")]
    public async Task<ActionResult<WaitingRollsResponse>> GetMinePushable(Guid campaignId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var mine = await _requests.ListMinePushableAsync(campaignId, accountId.Value, cancellationToken);
        return mine is null ? NotFound() : Ok(RollRequestMapping.ToResponse(mine));
    }

    /// <summary>Asks to push the Investigator's failed, pushable Requested Roll and returns it. The Investigator's Player only.</summary>
    [HttpPost("roll-requests/{rollRequestId:guid}/requested-rolls/{investigatorId:guid}/push")]
    public async Task<ActionResult<RequestedRollResponse>> Push(Guid campaignId, Guid rollRequestId, Guid investigatorId, PushRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.AskToPushAsync(campaignId, accountId.Value, rollRequestId, investigatorId, request?.Justification, cancellationToken);
        return result.Roll is not null ? Ok(RollRequestMapping.ToResponse(result.Roll)) : PushFailure(result.Outcome);
    }

    /// <summary>Approves the Investigator's push with the Keeper's dice for the pushed roll and returns it. The Keeper only.</summary>
    [HttpPost("roll-requests/{rollRequestId:guid}/requested-rolls/{investigatorId:guid}/push/approve")]
    public async Task<ActionResult<RequestedRollResponse>> ApprovePush(Guid campaignId, Guid rollRequestId, Guid investigatorId, ApprovePushRequest request, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.ApprovePushAsync(campaignId, accountId.Value, rollRequestId, investigatorId, request?.BonusDice, request?.PenaltyDice, cancellationToken);
        return result.Roll is not null ? Ok(RollRequestMapping.ToResponse(result.Roll)) : ApprovePushFailure(result.Outcome);
    }

    /// <summary>Declines the Investigator's push and returns it. The Keeper only.</summary>
    [HttpPost("roll-requests/{rollRequestId:guid}/requested-rolls/{investigatorId:guid}/push/decline")]
    public async Task<ActionResult<RequestedRollResponse>> DeclinePush(Guid campaignId, Guid rollRequestId, Guid investigatorId, CancellationToken cancellationToken)
    {
        var accountId = await ResolveCallerAccountIdAsync(cancellationToken);
        if (accountId is null)
        {
            return Unauthorized();
        }

        var result = await _requests.DeclinePushAsync(campaignId, accountId.Value, rollRequestId, investigatorId, cancellationToken);
        return result.Roll is not null ? Ok(RollRequestMapping.ToResponse(result.Roll)) : DeclinePushFailure(result.Outcome);
    }

    private static RollRequestTargetInput ToInput(RollRequestTargetRequest? target) =>
        target is null
            ? new RollRequestTargetInput(RollRequestTargetKind.Unknown, null, null, null)
            : new RollRequestTargetInput(ParseKind(target.Kind), target.Skill, target.Specialization, target.Characteristic);

    private static RequestedRollCreateInput ToInput(RequestedRollCreateRequest investigator) =>
        new(investigator.InvestigatorId, ParseOptionalDifficulty(investigator.Difficulty), investigator.BonusDice, investigator.PenaltyDice);

    // A missing or unknown kind is Unknown, so the 409 for no Active Scene still wins over it.
    private static RollRequestTargetKind ParseKind(string? kind) =>
        Enum.TryParse<RollRequestTargetKind>(kind, ignoreCase: true, out var parsed) && parsed != RollRequestTargetKind.Unknown && Enum.IsDefined(parsed)
            ? parsed
            : RollRequestTargetKind.Unknown;

    private static RollRequestDifficulty? ParseOptionalDifficulty(string? difficulty) =>
        string.IsNullOrWhiteSpace(difficulty) ? null : ParseDifficulty(difficulty);

    private static RollRequestDifficulty ParseDifficulty(string? difficulty) =>
        Enum.TryParse<RollRequestDifficulty>(difficulty, ignoreCase: true, out var parsed) && parsed != RollRequestDifficulty.Unknown && Enum.IsDefined(parsed)
            ? parsed
            : RollRequestDifficulty.Unknown;

    private static RollRequestVisibility ParseVisibility(string? visibility) =>
        string.IsNullOrWhiteSpace(visibility)
            ? RollRequestVisibility.Public
            : Enum.TryParse<RollRequestVisibility>(visibility, ignoreCase: true, out var parsed) && parsed != RollRequestVisibility.Unknown && Enum.IsDefined(parsed)
                ? parsed
                : RollRequestVisibility.Unknown;

    private ActionResult CreateFailure(CreateRollRequestOutcome outcome) =>
        outcome switch
        {
            CreateRollRequestOutcome.NoActiveScene =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            CreateRollRequestOutcome.Conflict =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            CreateRollRequestOutcome.InvalidTarget => Invalid(RollRequestProblems.TargetKey, RollRequestProblems.UnknownTargetMessage),
            CreateRollRequestOutcome.UnknownTarget => Invalid(RollRequestProblems.TargetKey, RollRequestProblems.UnknownSkillMessage),
            CreateRollRequestOutcome.SpecializationRequired => Invalid(RollRequestProblems.TargetKey, RollRequestProblems.SpecializationRequiredMessage),
            CreateRollRequestOutcome.SpecializationNotAllowed => Invalid(RollRequestProblems.TargetKey, RollRequestProblems.SpecializationNotAllowedMessage),
            CreateRollRequestOutcome.InvestigatorNotApproved => Invalid(RollRequestProblems.InvestigatorsKey, RollRequestProblems.InvestigatorNotApprovedMessage),
            CreateRollRequestOutcome.EmptyInvestigators => Invalid(RollRequestProblems.InvestigatorsKey, RollRequestProblems.EmptyInvestigatorsMessage),
            CreateRollRequestOutcome.DuplicateInvestigator => Invalid(RollRequestProblems.InvestigatorsKey, RollRequestProblems.DuplicateInvestigatorMessage),
            CreateRollRequestOutcome.InvestigatorNotPresent => Invalid(RollRequestProblems.InvestigatorsKey, RollRequestProblems.InvestigatorNotPresentMessage),
            CreateRollRequestOutcome.InvalidLuckTarget => Invalid(RollRequestProblems.TargetKey, RollRequestProblems.InvalidLuckTargetMessage),
            CreateRollRequestOutcome.InvalidDice => Invalid(RollRequestProblems.DiceKey, RollRequestProblems.InvalidDiceMessage),
            CreateRollRequestOutcome.MessageTooLong => Invalid(RollRequestProblems.MessageKey, RollRequestProblems.MessageTooLongMessage),
            CreateRollRequestOutcome.InvalidDifficulty => Invalid(RollRequestProblems.DifficultyKey, RollRequestProblems.UnknownDifficultyMessage),
            CreateRollRequestOutcome.InvalidVisibility => Invalid(RollRequestProblems.VisibilityKey, RollRequestProblems.UnknownVisibilityMessage),
            _ => NotFound(),
        };

    private ActionResult RollFailure(RollRequestedRollOutcome outcome) =>
        outcome switch
        {
            RollRequestedRollOutcome.SceneNotActive =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            RollRequestedRollOutcome.NotWaiting =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            RollRequestedRollOutcome.AlreadyCancelled =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: RollRequestProblems.CancelledTitle),
            _ => NotFound(),
        };

    private ActionResult CancelFailure(CancelRequestedRollOutcome outcome) =>
        outcome switch
        {
            CancelRequestedRollOutcome.SceneNotActive =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            CancelRequestedRollOutcome.NotWaiting =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            CancelRequestedRollOutcome.AlreadyCancelled =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: RollRequestProblems.CancelledTitle),
            _ => NotFound(),
        };

    private ActionResult PushFailure(AskPushOutcome outcome) =>
        outcome switch
        {
            AskPushOutcome.SceneNotActive =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            AskPushOutcome.JustificationRequired => Invalid(RollRequestProblems.JustificationKey, RollRequestProblems.JustificationRequiredMessage),
            AskPushOutcome.JustificationTooLong => Invalid(RollRequestProblems.JustificationKey, RollRequestProblems.JustificationTooLongMessage),
            AskPushOutcome.AlreadyCancelled =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: RollRequestProblems.CancelledTitle),
            AskPushOutcome.NotPushable =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };

    private ActionResult ApprovePushFailure(ApprovePushOutcome outcome) =>
        outcome switch
        {
            ApprovePushOutcome.SceneNotActive =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            ApprovePushOutcome.InvalidDice => Invalid(RollRequestProblems.DiceKey, RollRequestProblems.InvalidDiceMessage),
            ApprovePushOutcome.AlreadyCancelled =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: RollRequestProblems.CancelledTitle),
            ApprovePushOutcome.NotPushAsked =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };

    private ActionResult DeclinePushFailure(DeclinePushOutcome outcome) =>
        outcome switch
        {
            DeclinePushOutcome.SceneNotActive =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ActiveSceneProblems.NoActiveSceneTitle),
            DeclinePushOutcome.AlreadyCancelled =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: RollRequestProblems.CancelledTitle),
            DeclinePushOutcome.NotPushAsked =>
                Problem(statusCode: StatusCodes.Status409Conflict, title: ItemHolderProblems.ConflictTitle),
            _ => NotFound(),
        };

    private ActionResult Invalid(string key, string message)
    {
        ModelState.AddModelError(key, message);
        return ValidationProblem(ModelState);
    }
}
