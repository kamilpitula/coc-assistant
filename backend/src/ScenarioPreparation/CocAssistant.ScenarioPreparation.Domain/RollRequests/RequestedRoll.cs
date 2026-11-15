namespace CocAssistant.ScenarioPreparation.Domain.RollRequests;

/// <summary>
/// One Investigator's roll in a Roll Request: the snapshot target value, the effective Difficulty and dice, and the Roll Record
/// once it rolls (specs/roll-requests/spec.md, Roll Request). A roll happens at most once; the version loses a concurrent second
/// roll (ADR 0032).
/// </summary>
public class RequestedRoll
{
    public const string RollRecordDice = "1D100";

    /// <summary>The suffix the pushed roll's Roll Record purpose carries (specs/roll-requests/spec.md, Roll Record).</summary>
    public const string PushPurposeSuffix = ":Push";

    /// <summary>The longest push justification the Keeper reads, trimmed, matching the request message limit.</summary>
    public const int JustificationMaxLength = 2000;

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

    /// <summary>The trimmed push justification, stored when the Player asks and never cleared, so a declined push counts as pushed (project_ruleset.md section 4.10).</summary>
    public string? PushJustification { get; private set; }

    /// <summary>The Keeper-approved dice for the pushed roll; the original BonusDice and PenaltyDice never change.</summary>
    public int? PushBonusDice { get; private set; }

    /// <summary>The Keeper-approved dice for the pushed roll; the original BonusDice and PenaltyDice never change.</summary>
    public int? PushPenaltyDice { get; private set; }

    /// <summary>Whether the roll was ever asked to push: true once a justification is stored, even when the Keeper declines.</summary>
    public bool HasBeenPushed { get; private set; }

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
    /// Rolls a Waiting or Pushed roll with the server's dice (ADR 0030): one Roll Record with the purpose
    /// <c>RollRequest:{request}:{investigator}</c> (and <c>:Push</c> for the pushed roll), the resolved percentile roll,
    /// whether it earns an experience check (character rules section 16.1 with project_ruleset.md section 4.9), who
    /// rolled, and when. A Waiting roll uses the request's dice; a Pushed roll uses the approved dice with the same
    /// target value and Difficulty (skill rolls section 6). A second roll is refused and changes nothing; a cancelled
    /// roll is refused as already cancelled.
    /// </summary>
    public RequestedRollOutcome Roll(IDiceRoller roller, Guid rollerAccountId, DateTimeOffset now)
    {
        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status is not (RequestedRollStatus.Waiting or RequestedRollStatus.Pushed))
        {
            return RequestedRollOutcome.NotWaiting;
        }

        AddRollRecord(roller, rollerAccountId, now);
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
    /// Asks to push a failed, pushable Rolled roll (skill rolls section 6): stores the trimmed justification and moves to
    /// PushAsked. Whether the roll can be pushed comes from the request (visibility, target, and the first result), because
    /// only the request knows them. A missing or too long justification is refused before the status; a cancelled roll is
    /// refused as already cancelled; any other non-pushable roll is refused and changes nothing.
    /// </summary>
    public RequestedRollOutcome AskToPush(string justification, bool isPushable)
    {
        var trimmed = string.IsNullOrWhiteSpace(justification) ? null : justification.Trim();
        if (trimmed is null)
        {
            return RequestedRollOutcome.JustificationRequired;
        }

        if (trimmed.Length > JustificationMaxLength)
        {
            return RequestedRollOutcome.JustificationTooLong;
        }

        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status != RequestedRollStatus.Rolled || !isPushable)
        {
            return RequestedRollOutcome.NotPushable;
        }

        PushJustification = trimmed;
        HasBeenPushed = true;
        Status = RequestedRollStatus.PushAsked;
        Version++;
        return RequestedRollOutcome.PushAsked;
    }

    /// <summary>
    /// Approves a PushAsked roll (skill rolls section 6): stores the Keeper's dice for the pushed roll and moves to Pushed.
    /// The dice are checked before the status; the original BonusDice and PenaltyDice never change. Any other status is
    /// refused and changes nothing.
    /// </summary>
    public RequestedRollOutcome ApprovePush(int bonusDice, int penaltyDice)
    {
        if (bonusDice is < 0 or > RollRequest.MaxDice || penaltyDice is < 0 or > RollRequest.MaxDice)
        {
            return RequestedRollOutcome.InvalidDice;
        }

        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status != RequestedRollStatus.PushAsked)
        {
            return RequestedRollOutcome.NotPushAsked;
        }

        PushBonusDice = bonusDice;
        PushPenaltyDice = penaltyDice;
        Status = RequestedRollStatus.Pushed;
        Version++;
        return RequestedRollOutcome.Pushed;
    }

    /// <summary>
    /// Declines a PushAsked roll (project_ruleset.md section 4.10): moves back to Rolled with its first result only. The
    /// justification is kept and the roll counts as pushed, so it cannot be asked again. Any other status is refused and
    /// changes nothing.
    /// </summary>
    public RequestedRollOutcome DeclinePush()
    {
        if (Status == RequestedRollStatus.Cancelled)
        {
            return RequestedRollOutcome.AlreadyCancelled;
        }

        if (Status != RequestedRollStatus.PushAsked)
        {
            return RequestedRollOutcome.NotPushAsked;
        }

        Status = RequestedRollStatus.Rolled;
        Version++;
        return RequestedRollOutcome.PushDeclined;
    }

    /// <summary>
    /// Closes the roll when its Scene exits: a Waiting or Pushed roll moves to Cancelled, a PushAsked roll moves back to
    /// Rolled (declined), and each change reports true. Rolled and Cancelled rolls are unchanged and report false.
    /// </summary>
    public bool CloseForSceneExit()
    {
        if (Status is RequestedRollStatus.Waiting or RequestedRollStatus.Pushed)
        {
            Status = RequestedRollStatus.Cancelled;
            Version++;
            return true;
        }

        if (Status == RequestedRollStatus.PushAsked)
        {
            Status = RequestedRollStatus.Rolled;
            Version++;
            return true;
        }

        return false;
    }

    private void AddRollRecord(IDiceRoller roller, Guid rollerAccountId, DateTimeOffset now)
    {
        var pushed = Status == RequestedRollStatus.Pushed;
        var bonusDice = pushed ? PushBonusDice!.Value : BonusDice;
        var penaltyDice = pushed ? PushPenaltyDice!.Value : PenaltyDice;
        var purpose = pushed ? $"RollRequest:{RollRequestId}:{InvestigatorId}{PushPurposeSuffix}" : $"RollRequest:{RollRequestId}:{InvestigatorId}";
        var percentile = PercentileRolling.Roll(roller, TargetValue, Difficulty, bonusDice, penaltyDice);
        _rollRecords.Add(new RollRecord(
            purpose,
            RollRecordDice,
            percentile.Result,
            RollSource.Server,
            [.. percentile.TensFaces, percentile.UnitsFace],
            rollerAccountId,
            now,
            percentile,
            ExperienceCheck.EarnsExperienceCheck(percentile.IsSuccess, bonusDice, penaltyDice, CanEarnExperienceCheck)));
    }
}
