namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>The port every dice result is rolled through (ADR 0030). Production uses SecureDiceRoller; tests inject a scripted roller.</summary>
public interface IDiceRoller
{
    int Roll(int sides);
}
