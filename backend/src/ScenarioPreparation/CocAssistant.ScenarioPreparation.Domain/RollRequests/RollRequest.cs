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
    /// A refused creation changes nothing.
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
        DateTimeOffset now)
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
        return new RollRequestCreation(RollRequestCreationOutcome.Created, request);
    }

    /// <summary>
    /// Rolls the Investigator's Requested Roll. An Investigator without a Requested Roll and an already Rolled one are
    /// refused and change nothing.
    /// </summary>
    public RequestedRollResult RollInvestigatorRoll(IDiceRoller roller, Guid investigatorId, Guid rollerAccountId, DateTimeOffset now)
    {
        var roll = _requestedRolls.FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId);
        if (roll is null)
        {
            return new RequestedRollResult(RequestedRollOutcome.InvestigatorNotRequested, null);
        }

        return roll.Roll(roller, rollerAccountId, now) == RequestedRollOutcome.Rolled
            ? new RequestedRollResult(RequestedRollOutcome.Rolled, roll)
            : new RequestedRollResult(RequestedRollOutcome.NotWaiting, null);
    }

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

    private static RollRequestCreation Refused(RollRequestCreationOutcome outcome) => new(outcome, null);
}
