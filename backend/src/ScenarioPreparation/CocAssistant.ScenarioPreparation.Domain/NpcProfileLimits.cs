namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The limits on an NPC Profile: docs/game-rules/project_ruleset.md section 5.2 for values, and
/// specs/scenario-preparation/spec.md (Constraints) for text and row counts. The limits shared with Monster Profiles
/// are held once in <see cref="ProfileLimits"/>.
/// </summary>
public static class NpcProfileLimits
{
    public const int NameMaxLength = ProfileLimits.NameMaxLength;
    public const int PlainTextMaxLength = ProfileLimits.PlainTextMaxLength;
    public const int RowTextMaxLength = ProfileLimits.RowTextMaxLength;
    public const int MaxRows = ProfileLimits.MaxRows;
    public const int AgeMaximum = 150;
    public const int SkillValueMaximum = 100;
    public const int ArmorPointsMaximum = ProfileLimits.ArmorPointsMaximum;
    public const int AttacksPerRoundMinimum = ProfileLimits.AttacksPerRoundMinimum;
    public const int AttacksPerRoundMaximum = ProfileLimits.AttacksPerRoundMaximum;
}
