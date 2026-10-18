namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterMovementValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(IReadOnlyList<MonsterMovementMode>? movement) =>
        MonsterProfileChecks.Rows("movement", movement, Row);

    private static IEnumerable<MonsterProfileProblem> Row(MonsterMovementMode mode, int index) =>
        Mode(mode, index)
            .Concat(Label(mode, index))
            .Concat(MonsterProfileChecks.RequiredInRange(
                ProfilePaths.Row("movement", index, "rate"),
                mode.Rate,
                0,
                MonsterProfileLimits.MovementRateMaximum,
                MonsterProfileProblemKind.MovementRateOutOfRange));

    private static IEnumerable<MonsterProfileProblem> Mode(MonsterMovementMode mode, int index) =>
        EnumNames.Canonical<MovementModeKind>(mode.Mode) is null
            ? [new MonsterProfileProblem(ProfilePaths.Row("movement", index, "mode"), MonsterProfileProblemKind.MovementModeNotListed)]
            : [];

    private static IEnumerable<MonsterProfileProblem> Label(MonsterMovementMode mode, int index)
    {
        var path = ProfilePaths.Row("movement", index, "label");
        var isOther = EnumNames.Canonical<MovementModeKind>(mode.Mode) == nameof(MovementModeKind.Other);
        return isOther
            ? MonsterProfileChecks.RequiredRowText(path, mode.Label, MonsterProfileProblemKind.MovementLabelRequired)
            : MonsterProfileChecks.RowText(path, mode.Label);
    }
}
