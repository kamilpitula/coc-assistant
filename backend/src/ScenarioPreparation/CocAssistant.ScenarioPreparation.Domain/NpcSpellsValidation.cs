namespace CocAssistant.ScenarioPreparation.Domain;

internal static class NpcSpellsValidation
{
    public static IEnumerable<NpcProfileProblem> Validate(IReadOnlyList<NpcSpell>? spells)
    {
        if (spells is null)
        {
            return [];
        }

        return spells.Count > NpcProfileLimits.MaxRows
            ? NpcProfileChecks.TooManyRows("spells")
            : spells.SelectMany(Row);
    }

    private static IEnumerable<NpcProfileProblem> Row(NpcSpell spell, int index)
    {
        var namePath = NpcProfileChecks.Row("spells", index, "name");
        var name = spell.Name is null
            ? [new NpcProfileProblem(namePath, NpcProfileProblemKind.SpellNameRequired)]
            : NpcProfileChecks.RowText(namePath, spell.Name);
        return name
            .Concat(NpcProfileChecks.RowText(NpcProfileChecks.Row("spells", index, "magicPointCost"), spell.MagicPointCost))
            .Concat(NpcProfileChecks.RowText(NpcProfileChecks.Row("spells", index, "effect"), spell.Effect));
    }
}
