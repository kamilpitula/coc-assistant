namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>
/// Whether a percentile roll may be pushed: a failed skill or characteristic roll that has not been pushed, where a
/// declined push counts as pushed (docs/game-rules/coc7_skill_rolls_rules.md section 6 and section 9 with
/// docs/game-rules/project_ruleset.md section 4.10). Luck, Sanity, and combat rolls are never pushed (section 7 and
/// section 8), so the caller says whether the roll is a skill or characteristic roll.
/// </summary>
public static class Pushing
{
    public static bool CanPush(bool isSuccess, bool hasBeenPushed, bool isSkillOrCharacteristicRoll) =>
        !isSuccess && !hasBeenPushed && isSkillOrCharacteristicRoll;
}
