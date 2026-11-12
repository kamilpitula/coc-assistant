namespace CocAssistant.ScenePlay.Controllers;

/// <summary>Maps Roll Request views to responses. Enums travel as their names.</summary>
internal static class RollRequestMapping
{
    public static RollRequestResponse ToResponse(RollRequestView view) =>
        new(
            view.Id,
            ToResponse(view.Target),
            view.Message,
            view.Visibility.ToString(),
            view.Difficulty.ToString(),
            view.BonusDice,
            view.PenaltyDice,
            view.CreatedAt,
            view.RequestedRolls.Select(ToResponse).ToList());

    public static RequestedRollResponse ToResponse(RequestedRollView view) =>
        new(
            view.InvestigatorId,
            view.InvestigatorName,
            view.TargetValue,
            view.UsesBaseValue,
            view.CanEarnExperienceCheck,
            view.Difficulty.ToString(),
            view.BonusDice,
            view.PenaltyDice,
            view.Status.ToString(),
            view.Rolls.Select(ToResponse).ToList());

    public static WaitingRollsResponse ToResponse(WaitingRollsResult result) =>
        new(result.InvestigatorName, result.Rolls.Select(ToResponse).ToList());

    private static WaitingRequestedRollResponse ToResponse(WaitingRequestedRollView view) =>
        new(view.RollRequestId, ToResponse(view.Target), view.Message, view.CreatedAt, ToResponse(view.Roll));

    private static RollRequestTargetResponse ToResponse(RollRequestTargetView view) =>
        new(view.Kind.ToString(), view.Skill, view.Specialization, view.Characteristic);

    private static CompletedRollResponse ToResponse(CompletedRollView view) =>
        new(
            view.Dice,
            view.Result,
            view.Faces,
            view.RolledByName,
            view.RolledAt,
            view.Percentile is null
                ? null
                : new PercentileOutcomeResponse(
                    view.Percentile.UnitsFace,
                    view.Percentile.TensFaces,
                    view.Percentile.KeptTens,
                    view.Percentile.Result,
                    view.Percentile.SuccessLevel.ToString(),
                    view.Percentile.IsSuccess),
            view.EarnsExperienceCheck);
}
