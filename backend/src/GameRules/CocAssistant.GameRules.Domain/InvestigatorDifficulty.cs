namespace CocAssistant.GameRules.Domain;

/// <summary>The difficulty an Investigator faces against an opposing value (CONTEXT.md: Investigator Difficulty).</summary>
public enum InvestigatorDifficulty
{
    Regular,
    Hard,
    Extreme,
}

/// <summary>docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md section 3.4.</summary>
public static class InvestigatorDifficulties
{
    private const int HardFrom = 50;
    private const int ExtremeFrom = 90;

    public static InvestigatorDifficulty ForOpposingValue(int opposingValue) => opposingValue switch
    {
        >= ExtremeFrom => InvestigatorDifficulty.Extreme,
        >= HardFrom => InvestigatorDifficulty.Hard,
        _ => InvestigatorDifficulty.Regular,
    };
}
