namespace CocAssistant.GameRules.Domain;

/// <summary>
/// A recorded Damage Bonus such as 0, +1D4, or -1 (docs/game-rules/project_ruleset.md section 5.5): an optional leading
/// "+" or "-" and then a <see cref="DiceNotation"/> without DB. It is checked and kept, never rolled (section 5.1).
/// </summary>
public sealed record DamageBonusNotation
{
    private DamageBonusNotation(string text, int sign, DiceNotation magnitude)
    {
        Text = text;
        Sign = sign;
        Magnitude = magnitude;
    }

    /// <summary>The notation trimmed at both ends, otherwise as entered.</summary>
    public string Text { get; }

    /// <summary>-1 for a leading "-", otherwise 1.</summary>
    public int Sign { get; }

    /// <summary>The notation after the optional sign.</summary>
    public DiceNotation Magnitude { get; }

    public static bool TryParse(string? text, out DamageBonusNotation? notation)
    {
        notation = null;
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return false;
        }

        var sign = trimmed[0] == '-' ? -1 : 1;
        var rest = trimmed[0] is '+' or '-' ? trimmed[1..] : trimmed;
        if (rest.Length != rest.TrimStart().Length || !DiceNotation.TryParse(rest, DamageBonusUse.Refused, out var magnitude))
        {
            return false;
        }

        notation = new DamageBonusNotation(trimmed, sign, magnitude!);
        return true;
    }

    public override string ToString() => Text;
}
