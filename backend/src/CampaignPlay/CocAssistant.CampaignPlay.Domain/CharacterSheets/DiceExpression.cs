namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>A dice expression such as 3D6, D100, or 1D10, and the range of raw totals it can produce.</summary>
public sealed record DiceExpression
{
    private readonly string _notation;

    private DiceExpression(string notation, int count, int sides)
    {
        _notation = notation;
        Count = count;
        Sides = sides;
    }

    public int Count { get; }
    public int Sides { get; }
    public int Minimum => Count;
    public int Maximum => Count * Sides;

    public bool CanProduce(int result) => result >= Minimum && result <= Maximum;

    /// <summary>Parses "nDm" or "Dm" (one die).</summary>
    public static DiceExpression Parse(string notation)
    {
        var parts = notation.Split('D');
        if (parts.Length != 2 || !int.TryParse(parts[1], out var sides) || sides < 1)
        {
            throw new FormatException($"'{notation}' is not a dice expression.");
        }

        var count = parts[0].Length == 0 ? 1 : int.Parse(parts[0], System.Globalization.CultureInfo.InvariantCulture);
        return new DiceExpression(notation, count, sides);
    }

    public override string ToString() => _notation;
}

/// <summary>The dice rolled during creation.</summary>
public static class CreationDice
{
    // Section 5.5: Luck is 3D6 x 5; the Roll Record keeps the raw 3D6 total.
    public static readonly DiceExpression Luck = DiceExpression.Parse("3D6");
    public const int LuckMultiplier = 5;

    // Section 3.2: each EDU improvement check rolls D100, and a success adds 1D10.
    public static readonly DiceExpression EduImprovementCheck = DiceExpression.Parse("D100");
    public static readonly DiceExpression EduImprovementGain = DiceExpression.Parse("1D10");
}
