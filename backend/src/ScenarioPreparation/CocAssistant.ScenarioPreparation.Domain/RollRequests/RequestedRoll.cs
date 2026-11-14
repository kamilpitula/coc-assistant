namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>
/// One Investigator's roll in a Roll Request: the snapshot target value, the effective Difficulty and dice, and the Roll Record
/// once it rolls (specs/roll-requests/spec.md, Roll Request). A roll happens at most once; the version loses a concurrent second
/// roll (ADR 0032).
/// </summary>
public class RequestedRoll
{
    public const string RollRecordDice = "1D100";

    // Not readonly: EF Core materializes the stored Roll Records JSON into this field (ADR 0032).
    private List<RollRecord> _rollRecords = [];

    public Guid RollRequestId { get; private set; }
    public Guid InvestigatorId { get; private set; }
    public int TargetValue { get; private set; }
    public bool UsesBaseValue { get; private set; }
    public bool CanEarnExperienceCheck { get; private set; }
    public Difficulty Difficulty { get; private set; }
    public int BonusDice { get; private set; }
    public int PenaltyDice { get; private set; }
    public RequestedRollStatus Status { get; private set; }

    /// <summary>The optimistic token that stops a Requested Roll being rolled twice (ADR 0032).</summary>
    public int Version { get; private set; }

    /// <summary>The Roll Record, once the roll rolled; at most one in this PBI.</summary>
    public IReadOnlyList<RollRecord> RollRecords => _rollRecords.ToList();

    private RequestedRoll()
    {
    }

    internal RequestedRoll(
        Guid rollRequestId,
        Guid investigatorId,
        int targetValue,
        bool usesBaseValue,
        bool canEarnExperienceCheck,
        Difficulty difficulty,
        int bonusDice,
        int penaltyDice)
    {
        RollRequestId = rollRequestId;
        InvestigatorId = investigatorId;
        TargetValue = targetValue;
        UsesBaseValue = usesBaseValue;
        CanEarnExperienceCheck = canEarnExperienceCheck;
        Difficulty = difficulty;
        BonusDice = bonusDice;
        PenaltyDice = penaltyDice;
        Status = RequestedRollStatus.Waiting;
    }

    /// <summary>
    /// Rolls a Waiting roll with the server's dice (ADR 0030): one Roll Record with the purpose
    /// <c>RollRequest:{request}:{investigator}</c>, the resolved percentile roll, whether it earns an experience check
    /// (character rules section 16.1 with project_ruleset.md section 4.9), who rolled, and when. A second roll is refused
    /// and changes nothing; a cancelled roll is refused as already cancelled.
    /// </summary>
    public RequestedRollOutcome Roll(IDiceRoller roller, Guid rollerAccountId, DateTimeOffset now)
    {
        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status != RequestedRollStatus.Waiting)
        {
            return RequestedRollOutcome.NotWaiting;
        }

        var percentile = PercentileRolling.Roll(roller, TargetValue, Difficulty, BonusDice, PenaltyDice);
        _rollRecords.Add(new RollRecord(
            $"RollRequest:{RollRequestId}:{InvestigatorId}",
            RollRecordDice,
            percentile.Result,
            RollSource.Server,
            [.. percentile.TensFaces, percentile.UnitsFace],
            rollerAccountId,
            now,
            percentile,
            ExperienceCheck.EarnsExperienceCheck(percentile.IsSuccess, BonusDice, PenaltyDice, CanEarnExperienceCheck)));
        Status = RequestedRollStatus.Rolled;
        Version++;
        return RequestedRollOutcome.Rolled;
    }

    /// <summary>
    /// Cancels a Waiting roll (specs/roll-requests/spec.md, Lifecycle with the Scene): no Roll Record is added, and the
    /// version bumps like a roll, so a roll racing the cancel loses. A rolled roll is refused as not waiting, and a
    /// cancelled one as already cancelled; neither changes anything.
    /// </summary>
    public RequestedRollOutcome Cancel()
    {
        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status != RequestedRollStatus.Waiting)
        {
            return RequestedRollOutcome.NotWaiting;
        }

        Status = RequestedRollStatus.Cancelled;
        Version++;
        return RequestedRollOutcome.Cancelled;
    }

    /// <summary>
    /// Closes the roll when its Scene exits: a Waiting roll moves to Cancelled and reports true, anything else
    /// reports false and changes nothing.
    /// </summary>
    public bool CloseForSceneExit()
    {
        if (Status != RequestedRollStatus.Waiting)
        {
            return false;
        }

        Status = RequestedRollStatus.Cancelled;
        Version++;
        return true;
    }
}
