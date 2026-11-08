namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>The only source of game random numbers: one die with the given sides (ADR 0030).</summary>
public sealed class SecureDiceRoller : IDiceRoller
{
    public int Roll(int sides)
    {
        if (sides < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(sides), "A die needs at least one side.");
        }

        return System.Security.Cryptography.RandomNumberGenerator.GetInt32(1, sides + 1);
    }
}
