namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>Rolls dice text (docs/game-rules/project_ruleset.md section 5.5) with an IDiceRoller.</summary>
public static class DiceRolling
{
    public static DiceRoll Roll(DiceExpression expression, IDiceRoller roller)
    {
        var faces = RollFaces(expression.Count, expression.Sides, roller);
        return new DiceRoll(expression.ToString(), faces, faces.Sum());
    }

    public static DiceRoll Roll(DiceNotation notation, IDiceRoller roller)
    {
        var faces = new List<int>();
        var total = 0;
        foreach (var term in notation.Terms)
        {
            total += RollTerm(term, roller, faces);
        }

        return new DiceRoll(notation.Text, faces, total);
    }

    private static int RollTerm(DiceNotationTerm term, IDiceRoller roller, List<int> faces)
    {
        if (term.Kind == DiceNotationTermKind.DamageBonus)
        {
            throw new ArgumentException("A Damage Bonus cannot be rolled without its value.", nameof(term));
        }

        if (term.Kind == DiceNotationTermKind.Constant)
        {
            return term.Sign * term.Count;
        }

        var rolled = RollFaces(term.Count, term.Sides, roller);
        faces.AddRange(rolled);
        return term.Sign * rolled.Sum();
    }

    private static IReadOnlyList<int> RollFaces(int count, int sides, IDiceRoller roller)
    {
        var faces = new List<int>(count);
        for (var index = 0; index < count; index++)
        {
            faces.Add(roller.Roll(sides));
        }

        return faces;
    }
}
