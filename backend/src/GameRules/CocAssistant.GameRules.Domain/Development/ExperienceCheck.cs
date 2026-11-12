namespace CocAssistant.GameRules.Domain.Development;

/// <summary>
/// Whether a percentile roll earns a skill experience check: a success on a skill that can earn one, unless the success used
/// a Bonus Die (docs/game-rules/coc7_character_creation_and_development_rules.md section 16.1). Only a net Bonus Die counts:
/// Penalty Dice that cancel the Bonus Dice still earn a check (docs/game-rules/project_ruleset.md section 4.9).
/// </summary>
public static class ExperienceCheck
{
    public static bool EarnsExperienceCheck(bool isSuccess, int bonusDice, int penaltyDice, bool skillCanEarnCheck) =>
        skillCanEarnCheck && isSuccess && bonusDice <= penaltyDice;
}
