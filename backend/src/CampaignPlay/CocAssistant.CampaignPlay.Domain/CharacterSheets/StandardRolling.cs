namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>A characteristic's Standard Rolling formula: (raw dice total + bonus) x multiplier.</summary>
public sealed record CharacteristicRollFormula(DiceExpression Dice, int Bonus, int Multiplier)
{
    public int ValueFor(int rawTotal) => (rawTotal + Bonus) * Multiplier;
}

/// <summary>
/// Standard Rolling: docs/game-rules/coc7_character_creation_and_development_rules.md section 2.1. The Roll Records keep
/// the raw dice totals; the characteristic values are computed from them.
/// </summary>
public static class StandardRolling
{
    private const int Multiplier = 5;
    private static readonly CharacteristicRollFormula ThreeDice = new(DiceExpression.Parse("3D6"), 0, Multiplier);
    private static readonly CharacteristicRollFormula TwoDicePlusSix = new(DiceExpression.Parse("2D6"), 6, Multiplier);

    public static CharacteristicRollFormula FormulaFor(Characteristic characteristic) =>
        characteristic is Characteristic.Size or Characteristic.Intelligence or Characteristic.Education
            ? TwoDicePlusSix
            : ThreeDice;

    /// <summary>The characteristic values computed from raw dice totals; a characteristic without a roll has no value.</summary>
    public static CharacteristicValues ValuesFrom(CharacteristicValues rawTotals) =>
        CharacteristicValues.From(CharacteristicCodes.All.Select(characteristic =>
            KeyValuePair.Create(
                characteristic,
                rawTotals[characteristic] is { } raw ? FormulaFor(characteristic).ValueFor(raw) : (int?)null)));
}
