namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

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
