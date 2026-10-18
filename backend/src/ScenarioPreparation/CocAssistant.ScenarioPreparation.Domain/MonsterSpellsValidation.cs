namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Spells and powers: free-text entries that differ only by the power's limits (project_ruleset.md section 5.6).</summary>
internal static class MonsterSpellsValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(IReadOnlyList<MonsterSpell>? spells, IReadOnlyList<MonsterPower>? powers) =>
        MonsterProfileChecks.Rows("spells", spells, Spell)
            .Concat(MonsterProfileChecks.Rows("powers", powers, Power));

    private static IEnumerable<MonsterProfileProblem> Spell(MonsterSpell spell, int index) =>
        Entry("spells", index, spell.Name, spell.MagicPointCost, spell.Effect, MonsterProfileProblemKind.SpellNameRequired);

    private static IEnumerable<MonsterProfileProblem> Power(MonsterPower power, int index) =>
        Entry("powers", index, power.Name, power.MagicPointCost, power.Effect, MonsterProfileProblemKind.PowerNameRequired)
            .Concat(MonsterProfileChecks.RowText(ProfilePaths.Row("powers", index, "limits"), power.Limits));

    private static IEnumerable<MonsterProfileProblem> Entry(
        string list,
        int index,
        string? name,
        string? magicPointCost,
        string? effect,
        MonsterProfileProblemKind nameRequired) =>
        MonsterProfileChecks.RequiredRowText(ProfilePaths.Row(list, index, "name"), name, nameRequired)
            .Concat(MonsterProfileChecks.RowText(ProfilePaths.Row(list, index, "magicPointCost"), magicPointCost))
            .Concat(MonsterProfileChecks.RowText(ProfilePaths.Row(list, index, "effect"), effect));
}
