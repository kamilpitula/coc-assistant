namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A Human NPC's worked-out values. Each is null when the characteristics it needs are not entered.
/// MovementRateNotCovered is true when STR, DEX, and SIZ are present but the age is outside 15-89.
/// </summary>
public sealed record NpcDerivedValues(
    int? HitPoints,
    int? MagicPoints,
    string? DamageBonus,
    int? Build,
    int? MovementRate,
    bool MovementRateNotCovered);

/// <summary>
/// Computes an NPC Profile's derived values and Investigator Difficulty on the server from the kernel formulas
/// (docs/game-rules/project_ruleset.md sections 5.3, 5.4, 5.7). Derived values are never overridden or stored.
/// </summary>
public static class NpcProfileCalculator
{
    private const int FirstCoveredAge = 15;
    private const int LastCoveredAge = 89;

    public static NpcDerivedValues Derive(NpcProfile profile, CharacteristicsRules rules)
    {
        var values = profile.Characteristics?.Values;
        int? Value(Characteristic characteristic) => values?.GetValueOrDefault(characteristic.ToCode());

        var damageAndBuild = DamageAndBuild(Value(Characteristic.Strength), Value(Characteristic.Size), rules);
        var (movementRate, notCovered) = Movement(
            Value(Characteristic.Strength),
            Value(Characteristic.Dexterity),
            Value(Characteristic.Size),
            profile.Age);
        return new NpcDerivedValues(
            HitPointsOf(Value(Characteristic.Constitution), Value(Characteristic.Size)),
            Value(Characteristic.Power) is { } power ? MagicPoints.For(power) : null,
            damageAndBuild?.DamageBonus,
            damageAndBuild?.Build,
            movementRate,
            notCovered);
    }

    public static InvestigatorDifficulty DifficultyOf(int opposingValue) => InvestigatorDifficulties.ForOpposingValue(opposingValue);

    private static int? HitPointsOf(int? constitution, int? size) =>
        constitution is { } con && size is { } siz ? HitPoints.For(con, siz) : null;

    private static (string DamageBonus, int Build)? DamageAndBuild(int? strength, int? size, CharacteristicsRules rules) =>
        strength is { } str && size is { } siz ? DamageBonusAndBuild.For(str + siz, rules) : null;

    private static (int? Rate, bool NotCovered) Movement(int? strength, int? dexterity, int? size, int? age)
    {
        if (strength is not { } str || dexterity is not { } dex || size is not { } siz || age is not { } years)
        {
            return (null, false);
        }

        return years is >= FirstCoveredAge and <= LastCoveredAge
            ? (MovementRate.For(str, dex, siz, years), false)
            : (null, true);
    }
}
