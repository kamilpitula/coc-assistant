namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>How well a percentile roll went, worst to best (docs/game-rules/coc7_skill_rolls_rules.md section 4.1).</summary>
public enum SuccessLevel
{
    Fumble,
    Failure,
    Regular,
    Hard,
    Extreme,
    Critical,
}
