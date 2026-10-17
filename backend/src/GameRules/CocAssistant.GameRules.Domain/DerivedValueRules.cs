namespace CocAssistant.GameRules.Domain;

/// <summary>Regular, Hard, and Extreme values: docs/game-rules/coc7_character_creation_and_development_rules.md section 4.</summary>
public sealed record CharacteristicLevels(int Regular, int Hard, int Extreme)
{
    public static CharacteristicLevels For(int regular) =>
        new(regular, RoundDown.Divide(regular, 2), RoundDown.Divide(regular, 5));
}

/// <summary>Magic Points: section 5.3.</summary>
public static class MagicPoints
{
    public static int For(int power) => RoundDown.Divide(power, 5);
}

/// <summary>Hit Points: section 5.4.</summary>
public static class HitPoints
{
    public static int For(int constitution, int size) => RoundDown.Divide(constitution + size, 10);
}

/// <summary>Movement Rate with the creation-age penalty: section 5.7.</summary>
public static class MovementRate
{
    public static int For(int strength, int dexterity, int size, int age) => BaseRate(strength, dexterity, size) - AgePenalty(age);

    private static int BaseRate(int strength, int dexterity, int size)
    {
        if (strength < size && dexterity < size)
        {
            return 7;
        }

        return strength > size && dexterity > size ? 9 : 8;
    }

    // One point per decade from the 40s (1) to the 80s (5).
    private static int AgePenalty(int age) => age switch
    {
        >= 40 and <= 89 => (age / 10) - 3,
        _ => 0,
    };
}

/// <summary>Damage Bonus and Build: section 5.8, using the table from the CharacteristicsRules catalog.</summary>
public static class DamageBonusAndBuild
{
    private const int TableMaximum = 524;
    private const int StepAboveTable = 80;
    private const int DiceAtTableMaximum = 5;
    private const int BuildAtTableMaximum = 6;

    /// <summary>Returns the Damage Bonus and Build, or null when STR + SIZ is below the table.</summary>
    public static (string DamageBonus, int Build)? For(int strengthSize, CharacteristicsRules rules)
    {
        if (strengthSize > TableMaximum)
        {
            var extra = (strengthSize - TableMaximum + StepAboveTable - 1) / StepAboveTable;
            return ($"+{DiceAtTableMaximum + extra}D6", BuildAtTableMaximum + extra);
        }

        var band = rules.DamageBonusAndBuild.SingleOrDefault(candidate => candidate.Contains(strengthSize));
        return band is null ? null : (band.DamageBonus, band.Build);
    }
}

/// <summary>Integer division rounded toward negative infinity, as the rules' floor() requires.</summary>
internal static class RoundDown
{
    public static int Divide(int value, int divisor) => (int)Math.Floor(value / (double)divisor);
}
