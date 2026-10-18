namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The limits on a Monster Profile: docs/game-rules/project_ruleset.md section 5.2 for values. The limits shared with NPC
/// Profiles are in <see cref="ProfileLimits"/>.
/// </summary>
public static class MonsterProfileLimits
{
    public const int ValueMaximum = 2_000;
    public const int MovementRateMaximum = 999;
    public const int HitPointsOverrideMinimum = 1;
    public const int HitPointsOverrideMaximum = 9_999;
    public const int MagicPointsOverrideMinimum = 0;
    public const int MagicPointsOverrideMaximum = 9_999;
    public const int BuildOverrideMinimum = -2;
    public const int BuildOverrideMaximum = 99;

    /// <summary>The longest reason for a Derived Value Override (specs/scenario-preparation/spec.md, Constraints).</summary>
    public const int OverrideReasonMaxLength = 500;
}
