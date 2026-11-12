namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Projects a Roll Request by who asks. Names come from the Approved Investigators and the Account names; no Account id
/// ever reaches a view (specs/roll-requests/spec.md, Visibility of results).
/// </summary>
internal static class RollRequestProjection
{
    public static RollRequestView ForView(
        RollRequestRecord request,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(
            request.Id,
            ForTarget(request.Target),
            request.Message,
            request.Visibility,
            request.Difficulty,
            request.BonusDice,
            request.PenaltyDice,
            request.CreatedAt,
            request.RequestedRolls.Select(roll => ForRoll(roll, InvestigatorName(approved, roll.InvestigatorId), rollerNames)).ToList());

    public static WaitingRequestedRollView ForWaiting(
        WaitingRequestedRollRecord waiting,
        IReadOnlyList<ApprovedInvestigatorRef> approved,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(
            waiting.RollRequestId,
            ForTarget(waiting.Target),
            waiting.Message,
            ForRoll(waiting.Roll, InvestigatorName(approved, waiting.Roll.InvestigatorId), rollerNames));

    public static RequestedRollView ForRoll(
        RequestedRollRecord roll,
        string? investigatorName,
        IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(
            roll.InvestigatorId,
            investigatorName,
            roll.TargetValue,
            roll.UsesBaseValue,
            roll.CanEarnExperienceCheck,
            roll.Difficulty,
            roll.BonusDice,
            roll.PenaltyDice,
            roll.Status,
            roll.RollRecords.Select(record => ForRecord(record, rollerNames)).ToList());

    private static RollRequestTargetView ForTarget(RollRequestTargetInput target) =>
        new(target.Kind, target.Skill, target.Specialization, target.Characteristic);

    private static CompletedRollView ForRecord(StoredRollRecord record, IReadOnlyDictionary<Guid, string> rollerNames) =>
        new(
            record.Dice,
            record.Result,
            record.Faces,
            record.RolledByAccountId is null ? null : rollerNames.GetValueOrDefault(record.RolledByAccountId.Value),
            record.RolledAt,
            record.Percentile is null
                ? null
                : new PercentileOutcomeView(
                    record.Percentile.UnitsFace,
                    record.Percentile.TensFaces,
                    record.Percentile.KeptTens,
                    record.Percentile.Result,
                    record.Percentile.SuccessLevel,
                    record.Percentile.IsSuccess),
            record.EarnsExperienceCheck);

    private static string? InvestigatorName(IReadOnlyList<ApprovedInvestigatorRef> approved, Guid investigatorId) =>
        approved.FirstOrDefault(candidate => candidate.InvestigatorId == investigatorId)?.Name;
}
