namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>A dice result used to create an Investigator: what it was rolled for, the dice, the raw result, and its source.</summary>
public sealed record RollRecord(string Purpose, string Dice, int Result, RollSource Source);

/// <summary>Who produced a dice result. v1 has only Player-entered results (docs/game-rules/project_ruleset.md section 4.3).</summary>
public enum RollSource
{
    PlayerEntered,
}

/// <summary>Turns a dice result into a Roll Record. A later Server source rolls itself without changing the sheet shape.</summary>
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
            : new RollRecord(purpose, dice.ToString(), playerEnteredResult.Value, RollSource.PlayerEntered);
}

/// <summary>The purposes Roll Records are stored under (specs/character-sheet/spec.md, Roll Records).</summary>
public static class RollPurposes
{
    public const string Luck = "Luck";
    public const string LuckSecondRoll = "Luck:SecondRoll";

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
