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
    /// and changes nothing.
    /// </summary>
    public RequestedRollOutcome Roll(IDiceRoller roller, Guid rollerAccountId, DateTimeOffset now)
    {
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
}
