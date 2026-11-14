namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>One Investigator's input to a Roll Request: the snapshot target value and the per-Investigator overrides.</summary>
public sealed record RequestedRollInput(
    Guid InvestigatorId,
    int TargetValue,
    bool UsesBaseValue,
    bool CanEarnExperienceCheck,
    Difficulty? Difficulty = null,
    int? BonusDice = null,
    int? PenaltyDice = null);

/// <summary>
/// A Keeper's request for rolls in the Active Scene (specs/roll-requests/spec.md, Roll Request; ADR 0032): the target, the
/// message, the visibility, the default Difficulty and dice, and one Requested Roll per targeted Investigator present. Target
/// values are snapshotted at creation; the request never changes afterwards.
/// </summary>
public class RollRequest
{
    public const int MessageMaxLength = 2000;
    public const int MaxDice = 2;

    private readonly List<RequestedRoll> _requestedRolls = [];

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public Guid SceneId { get; private set; }
    public RollTarget Target { get; private set; } = null!;
    public string? Message { get; private set; }
    public RollRequestVisibility Visibility { get; private set; }
    public Difficulty Difficulty { get; private set; }
    public int BonusDice { get; private set; }
    public int PenaltyDice { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>The Requested Rolls in creation order.</summary>
    public IReadOnlyList<RequestedRoll> RequestedRolls => _requestedRolls.ToList();

    private RollRequest()
    {
    }

    private RollRequest(
        Guid campaignId,
        Guid sceneId,
        RollTarget target,
        string? message,
        RollRequestVisibility visibility,
        Difficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRoll> requestedRolls,
        DateTimeOffset now)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        SceneId = sceneId;
        Target = target;
        Message = message;
        Visibility = visibility;
        Difficulty = difficulty;
        BonusDice = bonusDice;
        PenaltyDice = penaltyDice;
        CreatedAt = now;
        _requestedRolls.AddRange(requestedRolls);
    }

    /// <summary>
    /// Creates a Roll Request for the Investigators present. Checks run in this order: the target, the Investigators (not
    /// empty, no duplicate, every one present), the dice (each within the skill rolls section 5 limits, then a Luck target
    /// at Regular with no dice under project_ruleset.md section 4.8), and the message. Overrides fall back to the defaults.
    /// A KeeperOnly request is rolled at creation: every Requested Roll goes straight to Rolled with the creating Keeper
    /// as the roller, in the same save. A refused creation changes nothing and draws no dice.
    /// </summary>
    public static RollRequestCreation Create(
        Guid campaignId,
        Guid sceneId,
        RollTarget target,
        string? message,
        RollRequestVisibility visibility,
        Difficulty difficulty,
        int bonusDice,
        int penaltyDice,
        IReadOnlyList<RequestedRollInput> investigators,
        IReadOnlyCollection<Guid> presentInvestigatorIds,
        DateTimeOffset now,
        IDiceRoller dice,
        Guid requestedByAccountId)
    {
        if (!IsTarget(target))
        {
            return Refused(RollRequestCreationOutcome.InvalidTarget);
        }

        var investigatorOutcome = CheckInvestigators(investigators, presentInvestigatorIds);
        if (investigatorOutcome != RollRequestCreationOutcome.Created)
        {
            return Refused(investigatorOutcome);
        }

        var diceOutcome = CheckDice(investigators, bonusDice, penaltyDice);
        if (diceOutcome != RollRequestCreationOutcome.Created)
        {
            return Refused(diceOutcome);
        }

        var luckOutcome = CheckLuck(target, investigators, difficulty, bonusDice, penaltyDice);
        if (luckOutcome != RollRequestCreationOutcome.Created)
        {
            return Refused(luckOutcome);
        }

        var trimmed = TrimMessage(message);
        if (IsMessageTooLong(trimmed))
        {
            return Refused(RollRequestCreationOutcome.MessageTooLong);
        }

        var request = new RollRequest(campaignId, sceneId, target, trimmed, visibility, difficulty, bonusDice, penaltyDice, [], now);
        request._requestedRolls.AddRange(investigators.Select(input => new RequestedRoll(
            request.Id,
            input.InvestigatorId,
            input.TargetValue,
            input.UsesBaseValue,
            input.CanEarnExperienceCheck,
            input.Difficulty ?? difficulty,
            input.BonusDice ?? bonusDice,
            input.PenaltyDice ?? penaltyDice)));
        if (visibility == RollRequestVisibility.KeeperOnly)
        {
            request.RollHidden(dice, requestedByAccountId, now);
        }

        return new RollRequestCreation(RollRequestCreationOutcome.Created, request);
    }

    /// <summary>
    /// Rolls the Investigator's Requested Roll. An Investigator without a Requested Roll and an already Rolled one are
    /// refused and change nothing; a cancelled one is refused as already cancelled.
    /// </summary>
    public RequestedRollResult RollInvestigatorRoll(IDiceRoller roller, Guid investigatorId, Guid rollerAccountId, DateTimeOffset now)
    {
        var roll = _requestedRolls.FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId);
        if (roll is null)
        {
            return new RequestedRollResult(RequestedRollOutcome.InvestigatorNotRequested, null);
        }

        return roll.Roll(roller, rollerAccountId, now) switch
        {
            RequestedRollOutcome.Rolled => new RequestedRollResult(RequestedRollOutcome.Rolled, roll),
            RequestedRollOutcome.AlreadyCancelled => new RequestedRollResult(RequestedRollOutcome.AlreadyCancelled, null),
            _ => new RequestedRollResult(RequestedRollOutcome.NotWaiting, null),
        };
    }

    /// <summary>
    /// Cancels the Investigator's Requested Roll (specs/roll-requests/spec.md, cancel contract): a Waiting roll moves to
    /// Cancelled. An Investigator without a Requested Roll, an already Rolled one, and an already Cancelled one are
    /// refused and change nothing.
    /// </summary>
    public RequestedRollResult CancelInvestigatorRoll(Guid investigatorId)
    {
        var roll = _requestedRolls.FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId);
        if (roll is null)
        {
            return new RequestedRollResult(RequestedRollOutcome.InvestigatorNotRequested, null);
        }

        return roll.Cancel() switch
        {
            RequestedRollOutcome.Cancelled => new RequestedRollResult(RequestedRollOutcome.Cancelled, roll),
            RequestedRollOutcome.AlreadyCancelled => new RequestedRollResult(RequestedRollOutcome.AlreadyCancelled, null),
            _ => new RequestedRollResult(RequestedRollOutcome.NotWaiting, null),
        };
    }

    /// <summary>
    /// Closes the Waiting Requested Rolls a Scene exit affects (specs/roll-requests/spec.md, Lifecycle with the Scene):
    /// every Waiting roll whose Investigator matches moves to Cancelled. Returns the closed Investigator ids in request order.
    /// </summary>
    public IReadOnlyList<Guid> CloseRollsForSceneExit(Func<Guid, bool> isAffected) =>
        _requestedRolls
            .Where(roll => isAffected(roll.InvestigatorId) && roll.CloseForSceneExit())
            .Select(roll => roll.InvestigatorId)
            .ToList();

    private static bool IsTarget(RollTarget target) =>
        target.Kind switch
        {
            RollTargetKind.Skill => !string.IsNullOrWhiteSpace(target.Skill),
            RollTargetKind.Characteristic => target.Characteristic is not null,
            RollTargetKind.Luck => true,
            _ => false,
        };

    private static RollRequestCreationOutcome CheckInvestigators(
        IReadOnlyList<RequestedRollInput> investigators,
        IReadOnlyCollection<Guid> presentInvestigatorIds)
    {
        if (investigators.Count == 0)
        {
            return RollRequestCreationOutcome.EmptyInvestigators;
        }

        if (investigators.Select(input => input.InvestigatorId).Distinct().Count() != investigators.Count)
        {
            return RollRequestCreationOutcome.DuplicateInvestigator;
        }

        return investigators.All(input => presentInvestigatorIds.Contains(input.InvestigatorId))
            ? RollRequestCreationOutcome.Created
            : RollRequestCreationOutcome.InvestigatorNotPresent;
    }

    private static bool InDiceRange(int dice) => dice is >= 0 and <= MaxDice;

    private static RollRequestCreationOutcome CheckDice(
        IReadOnlyList<RequestedRollInput> investigators, int bonusDice, int penaltyDice)
    {
        if (!InDiceRange(bonusDice) || !InDiceRange(penaltyDice))
        {
            return RollRequestCreationOutcome.InvalidDice;
        }

        return investigators.Any(input => !InDiceRange(input.BonusDice ?? bonusDice) || !InDiceRange(input.PenaltyDice ?? penaltyDice))
            ? RollRequestCreationOutcome.InvalidDice
            : RollRequestCreationOutcome.Created;
    }

    private static RollRequestCreationOutcome CheckLuck(
        RollTarget target,
        IReadOnlyList<RequestedRollInput> investigators,
        Difficulty difficulty,
        int bonusDice,
        int penaltyDice)
    {
        if (target.Kind != RollTargetKind.Luck)
        {
            return RollRequestCreationOutcome.Created;
        }

        return investigators.Any(input => IsNonRegularLuck(input, difficulty, bonusDice, penaltyDice))
            ? RollRequestCreationOutcome.InvalidLuckTarget
            : RollRequestCreationOutcome.Created;
    }

    private static bool IsNonRegularLuck(RequestedRollInput input, Difficulty difficulty, int bonusDice, int penaltyDice) =>
        (input.Difficulty ?? difficulty) != Difficulty.Regular
        || (input.BonusDice ?? bonusDice) != 0
        || (input.PenaltyDice ?? penaltyDice) != 0;

    private static string? TrimMessage(string? message) =>
        string.IsNullOrWhiteSpace(message) ? null : message.Trim();

    private static bool IsMessageTooLong(string? trimmed) => trimmed is not null && trimmed.Length > MessageMaxLength;

    private void RollHidden(IDiceRoller dice, Guid keeperAccountId, DateTimeOffset now)
    {
        foreach (var roll in _requestedRolls)
        {
            roll.Roll(dice, keeperAccountId, now);
        }
    }

    private static RollRequestCreation Refused(RollRequestCreationOutcome outcome) => new(outcome, null);
}
