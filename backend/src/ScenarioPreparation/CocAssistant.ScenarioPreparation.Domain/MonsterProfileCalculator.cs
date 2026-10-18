namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Computes a Monster Profile's derived values and Investigator Difficulty on the server from the kernel formulas
/// (docs/game-rules/project_ruleset.md sections 5.4 and 5.9; NPC ruleset sections 3.2 and 3.4). Overrides are stored
/// beside the computed values and never replace them; the human MOV formula never runs for a Mythos Creature.
/// </summary>
public static class MonsterProfileCalculator
{
    public static CharacteristicDerivedValues Derive(MonsterProfile profile, CharacteristicsRules rules) =>
        CharacteristicDerivedValues.From(profile.Characteristics?.Values ?? new Dictionary<string, int?>(), rules);

    public static InvestigatorDifficulty DifficultyOf(int opposingValue) => InvestigatorDifficulties.ForOpposingValue(opposingValue);
}
