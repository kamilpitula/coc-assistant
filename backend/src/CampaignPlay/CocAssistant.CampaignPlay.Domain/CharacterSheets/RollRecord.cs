namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Turns a dice result the Player entered into a Roll Record.</summary>
public interface IRollSource
{
    /// <summary>Returns the Roll Record for the purpose, or null when there is no result yet.</summary>
    RollRecord? Record(string purpose, DiceExpression dice, int? playerEnteredResult);
}

/// <summary>Records results the Player rolled at the table. Impossible results are kept and reported by validation.</summary>
public sealed class PlayerEnteredRollSource : IRollSource
{
    public RollRecord? Record(string purpose, DiceExpression dice, int? playerEnteredResult) =>
        playerEnteredResult is null
            ? null
            : RollRecord.PlayerEntered(purpose, dice.ToString(), playerEnteredResult.Value);
}

/// <summary>The purposes Roll Records are stored under (specs/character-sheet/spec.md, Roll Records).</summary>
public static class RollPurposes
{
    public const string Luck = "Luck";
    public const string LuckSecondRoll = "Luck:SecondRoll";

    /// <summary>The Standard Rolling roll of a characteristic (section 2.1), for example "Characteristic:STR".</summary>
    public static string Characteristic(Characteristic characteristic) => $"Characteristic:{characteristic.ToCode()}";

    /// <summary>Whether the purpose is a characteristic roll, which the Creation Method lock and PUT merging keep.</summary>
    public static bool IsCharacteristicPurpose(string purpose) =>
        CharacteristicPurposes.Contains(purpose);

    private static readonly HashSet<string> CharacteristicPurposes =
        CharacteristicCodes.All.Select(characteristic => $"Characteristic:{characteristic.ToCode()}").ToHashSet(StringComparer.Ordinal);

    /// <summary>The D100 roll of the 1-based EDU improvement check.</summary>
    public static string EduImprovementCheck(int checkNumber) => $"EduImprovement[{checkNumber}].Check";

    /// <summary>The 1D10 gain of the 1-based EDU improvement check.</summary>
    public static string EduImprovementGain(int checkNumber) => $"EduImprovement[{checkNumber}].Gain";

    /// <summary>The EDU improvement check number a purpose belongs to, or null for other purposes.</summary>
    public static int? EduImprovementCheckNumberOf(string purpose)
    {
        const string prefix = "EduImprovement[";
        if (!purpose.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        var end = purpose.IndexOf(']', prefix.Length);
        return end > prefix.Length && int.TryParse(purpose.AsSpan(prefix.Length, end - prefix.Length), out var number)
            ? number
            : null;
    }
}
