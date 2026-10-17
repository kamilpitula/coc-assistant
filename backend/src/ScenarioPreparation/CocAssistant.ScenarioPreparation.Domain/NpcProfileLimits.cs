namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The limits on an NPC Profile: docs/game-rules/project_ruleset.md section 5.2 for values, and
/// specs/scenario-preparation/spec.md (Constraints) for text and row counts.
/// </summary>
public static class NpcProfileLimits
{
    public const int NameMaxLength = 200;
    public const int PlainTextMaxLength = 4_000;
    public const int RowTextMaxLength = 1_000;
    public const int MaxRows = 100;
    public const int AgeMaximum = 150;
    public const int SkillValueMaximum = 100;
    public const int ArmorPointsMaximum = 2_000;
    public const int AttacksPerRoundMinimum = 1;
    public const int AttacksPerRoundMaximum = 99;
}
