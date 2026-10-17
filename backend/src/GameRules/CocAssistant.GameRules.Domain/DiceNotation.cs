namespace CocAssistant.GameRules.Domain;

/// <summary>Whether Damage Bonus ("DB") may appear in a notation.</summary>
public enum DamageBonusUse
{
    Allowed,
    Refused,
}

public enum DiceNotationTermKind
{
    Dice,
    Constant,
    DamageBonus,
}

/// <summary>
/// One signed term. For Dice, Count dice of Sides sides; for Constant, Count is the value and Sides is 0;
/// for DamageBonus, Count and Sides are 0.
/// </summary>
public readonly record struct DiceNotationTerm(DiceNotationTermKind Kind, int Sign, int Count, int Sides);

/// <summary>
/// Recorded dice text such as 1D6+1D4+DB or 2D6-1 (docs/game-rules/project_ruleset.md section 5.5).
/// It is checked and kept, never rolled (section 5.1).
/// </summary>
public sealed partial record DiceNotation
{
    private DiceNotation(string text, IReadOnlyList<DiceNotationTerm> terms)
    {
        Text = text;
        Terms = terms;
    }

    /// <summary>The notation trimmed at both ends, otherwise as entered.</summary>
    public string Text { get; }

    public IReadOnlyList<DiceNotationTerm> Terms { get; }

    public bool IncludesDamageBonus => Terms.Any(term => term.Kind == DiceNotationTermKind.DamageBonus);

    /// <summary>Interior whitespace, a count of 0, and 0 sides are refused.</summary>
    public static bool TryParse(string? text, DamageBonusUse damageBonus, out DiceNotation? notation)
    {
        notation = null;
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed) || !TryParseTerms(trimmed, damageBonus, out var terms))
        {
            return false;
        }

        notation = new DiceNotation(trimmed, terms);
        return true;
    }

    public override string ToString() => Text;

    private static bool TryParseTerms(string text, DamageBonusUse damageBonus, out List<DiceNotationTerm> terms)
    {
        terms = [];
        var sign = 1;
        var start = 0;
        for (var index = 0; index <= text.Length; index++)
        {
            if (index < text.Length && text[index] is not ('+' or '-'))
            {
                continue;
            }

            var term = ParseTerm(sign, text[start..index]);
            if (term is null || (term.Value.Kind == DiceNotationTermKind.DamageBonus && damageBonus == DamageBonusUse.Refused))
            {
                return false;
            }

            terms.Add(term.Value);
            sign = index < text.Length && text[index] == '-' ? -1 : 1;
            start = index + 1;
        }

        return true;
    }

    private static DiceNotationTerm? ParseTerm(int sign, string term)
    {
        if (string.Equals(term, "DB", StringComparison.OrdinalIgnoreCase))
        {
            return new DiceNotationTerm(DiceNotationTermKind.DamageBonus, sign, 0, 0);
        }

        var dice = DicePattern().Match(term);
        if (dice.Success)
        {
            return ParseDice(sign, dice);
        }

        return int.TryParse(term, NumberStyles.None, CultureInfo.InvariantCulture, out var constant)
            && ConstantPattern().IsMatch(term)
            ? new DiceNotationTerm(DiceNotationTermKind.Constant, sign, constant, 0)
            : null;
    }

    private static DiceNotationTerm? ParseDice(int sign, Match dice)
    {
        var countText = dice.Groups["count"].Value;
        var count = 1;
        var countValid = countText.Length == 0 || int.TryParse(countText, NumberStyles.None, CultureInfo.InvariantCulture, out count);
        var sidesValid = int.TryParse(dice.Groups["sides"].Value, NumberStyles.None, CultureInfo.InvariantCulture, out var sides);
        return countValid && sidesValid && count >= 1 && sides >= 1
            ? new DiceNotationTerm(DiceNotationTermKind.Dice, sign, count, sides)
            : null;
    }

    [GeneratedRegex(@"^(?<count>[0-9]*)[dD](?<sides>[0-9]+)\z", RegexOptions.CultureInvariant)]
    private static partial Regex DicePattern();

    [GeneratedRegex(@"^[0-9]+\z", RegexOptions.CultureInvariant)]
    private static partial Regex ConstantPattern();
}
