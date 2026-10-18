namespace CocAssistant.GameRules.Domain;

/// <summary>
/// Recorded sanity loss written "success/failure", such as 0/1D6 (docs/game-rules/project_ruleset.md section 5.5). Each
/// side is a <see cref="DiceNotation"/> without Damage Bonus. It is checked and kept, never rolled (section 5.1).
/// </summary>
public sealed record SanityLossNotation
{
    private SanityLossNotation(string text, DiceNotation success, DiceNotation failure)
    {
        Text = text;
        Success = success;
        Failure = failure;
    }

    /// <summary>The notation trimmed at both ends, otherwise as entered.</summary>
    public string Text { get; }

    public DiceNotation Success { get; }

    public DiceNotation Failure { get; }

    /// <summary>Exactly one "/" is required; neither side may be empty or padded with whitespace.</summary>
    public static bool TryParse(string? text, out SanityLossNotation? notation)
    {
        notation = null;
        var sides = text?.Trim().Split('/');
        if (sides is not { Length: 2 } || !TryParseSide(sides[0], out var success) || !TryParseSide(sides[1], out var failure))
        {
            return false;
        }

        notation = new SanityLossNotation(text!.Trim(), success!, failure!);
        return true;
    }

    public override string ToString() => Text;

    private static bool TryParseSide(string side, out DiceNotation? notation)
    {
        notation = null;
        return side.Length == side.Trim().Length && DiceNotation.TryParse(side, DamageBonusUse.Refused, out notation);
    }
}
