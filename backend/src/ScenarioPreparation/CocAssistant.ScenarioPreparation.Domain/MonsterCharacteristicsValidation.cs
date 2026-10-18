namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Characteristics, Derived Value Overrides, and Hit Points not applicable, which live in one section
/// (docs/game-rules/project_ruleset.md sections 5.2 and 5.4).
/// </summary>
internal static class MonsterCharacteristicsValidation
{
    private const string OverridesPath = "characteristics.overrides";

    public static IEnumerable<MonsterProfileProblem> Validate(MonsterCharacteristics? characteristics, MonsterDetails details)
    {
        if (characteristics is null)
        {
            return [];
        }

        var overrides = characteristics.Overrides;
        return characteristics.Values.SelectMany(entry => Value(entry.Key, entry.Value))
            .Concat(CheckNumberOverride(
                $"{OverridesPath}.hitPoints",
                overrides.HitPoints,
                MonsterProfileLimits.HitPointsOverrideMinimum,
                MonsterProfileLimits.HitPointsOverrideMaximum,
                MonsterProfileProblemKind.HitPointsOverrideOutOfRange))
            .Concat(CheckNumberOverride(
                $"{OverridesPath}.magicPoints",
                overrides.MagicPoints,
                MonsterProfileLimits.MagicPointsOverrideMinimum,
                MonsterProfileLimits.MagicPointsOverrideMaximum,
                MonsterProfileProblemKind.MagicPointsOverrideOutOfRange))
            .Concat(CheckDamageBonusOverride(overrides.DamageBonus))
            .Concat(CheckNumberOverride(
                $"{OverridesPath}.build",
                overrides.Build,
                MonsterProfileLimits.BuildOverrideMinimum,
                MonsterProfileLimits.BuildOverrideMaximum,
                MonsterProfileProblemKind.BuildOverrideOutOfRange))
            .Concat(HitPointsNotApplicable(characteristics, details));
    }

    private static IEnumerable<MonsterProfileProblem> Value(string code, int? value)
    {
        var path = $"characteristics.values.{code}";
        if (!CharacteristicCodes.TryParse(code, out _))
        {
            return [new MonsterProfileProblem(path, MonsterProfileProblemKind.UnknownCharacteristic)];
        }

        return MonsterProfileChecks.OptionalInRange(path, value, 0, MonsterProfileLimits.ValueMaximum, MonsterProfileProblemKind.CharacteristicOutOfRange);
    }

    private static IEnumerable<MonsterProfileProblem> CheckNumberOverride(string path, NumberOverride? made, int minimum, int maximum, MonsterProfileProblemKind outOfRange)
    {
        if (made is null)
        {
            return [];
        }

        IEnumerable<MonsterProfileProblem> value = made.Value is null
            ? [new MonsterProfileProblem($"{path}.value", MonsterProfileProblemKind.OverrideValueRequired)]
            : MonsterProfileChecks.RequiredInRange($"{path}.value", made.Value, minimum, maximum, outOfRange);
        return value.Concat(Reason(path, made.Reason));
    }

    private static IEnumerable<MonsterProfileProblem> CheckDamageBonusOverride(DamageBonusOverride? made)
    {
        if (made is null)
        {
            return [];
        }

        const string path = $"{OverridesPath}.damageBonus";
        return DamageBonusValue($"{path}.value", made.Value).Concat(Reason(path, made.Reason));
    }

    private static IEnumerable<MonsterProfileProblem> DamageBonusValue(string path, string? value)
    {
        if (value is null)
        {
            return [new MonsterProfileProblem(path, MonsterProfileProblemKind.OverrideValueRequired)];
        }

        if (value.Length > ProfileLimits.RowTextMaxLength)
        {
            return MonsterProfileChecks.RowText(path, value);
        }

        return DamageBonusNotation.TryParse(value, out _)
            ? []
            : [new MonsterProfileProblem(path, MonsterProfileProblemKind.DamageBonusOverrideMalformed)];
    }

    private static IEnumerable<MonsterProfileProblem> Reason(string path, string? reason) => reason switch
    {
        null => [new MonsterProfileProblem($"{path}.reason", MonsterProfileProblemKind.OverrideReasonRequired)],
        { Length: > MonsterProfileLimits.OverrideReasonMaxLength } =>
            [new MonsterProfileProblem($"{path}.reason", MonsterProfileProblemKind.OverrideReasonTooLong)],
        _ => [],
    };

    private static IEnumerable<MonsterProfileProblem> HitPointsNotApplicable(MonsterCharacteristics characteristics, MonsterDetails details)
    {
        if (!characteristics.HitPointsNotApplicable)
        {
            return [];
        }

        IEnumerable<MonsterProfileProblem> conflict = characteristics.Overrides.HitPoints is null
            ? []
            : [new MonsterProfileProblem("characteristics.hitPointsNotApplicable", MonsterProfileProblemKind.HitPointsOverriddenAndNotApplicable)];
        IEnumerable<MonsterProfileProblem> defeatOutcome = details.DefeatOutcome is null
            ? [new MonsterProfileProblem("details.defeatOutcome", MonsterProfileProblemKind.DefeatOutcomeRequired)]
            : [];
        return conflict.Concat(defeatOutcome);
    }
}
