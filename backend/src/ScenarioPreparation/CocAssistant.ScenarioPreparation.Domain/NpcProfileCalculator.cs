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
        var values = profile.Characteristics?.Values ?? new Dictionary<string, int?>();
        int? Value(Characteristic characteristic) => values.GetValueOrDefault(characteristic.ToCode());

        var shared = CharacteristicDerivedValues.From(values, rules);
        var (movementRate, notCovered) = Movement(
            Value(Characteristic.Strength),
            Value(Characteristic.Dexterity),
            Value(Characteristic.Size),
            profile.Age);
        return new NpcDerivedValues(shared.HitPoints, shared.MagicPoints, shared.DamageBonus, shared.Build, movementRate, notCovered);
    }

    public static InvestigatorDifficulty DifficultyOf(int opposingValue) => InvestigatorDifficulties.ForOpposingValue(opposingValue);

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
