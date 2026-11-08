namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>The result of rolling dice text: the text, every die face in roll order, and the signed total.</summary>
public sealed record DiceRoll(string Dice, IReadOnlyList<int> Faces, int Total);
