namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The kinds of problem that block saving an NPC Profile (docs/game-rules/project_ruleset.md section 5.8).</summary>
public enum NpcProfileProblemKind
{
    NameRequired,
    NameTooLong,
    AgeRequired,
    AgeOutOfRange,
    TextTooLong,
    RowTextTooLong,
    TooManyRows,
    UnknownCharacteristic,
    CharacteristicOutOfRange,
    SkillNameRequired,
    SkillValueOutOfRange,
    SpecializationNotListed,
    DodgeOutOfRange,
    ArmorPointsOutOfRange,
    WeaponNameRequired,
    WeaponSkillNotOnProfile,
    DamageRequired,
    DamageMalformed,
    DamageBonusOnFirearm,
    AttacksPerRoundOutOfRange,
    SpellNameRequired,
    KeeperNotesInvalid,
}

/// <summary>
/// One refused value: the camelCase JSON path it has in the request (ADR 0018) and the kind of problem. Subject names
/// the skill family for <see cref="NpcProfileProblemKind.SpecializationNotListed"/> and is empty otherwise.
/// </summary>
public sealed record NpcProfileProblem(string Path, NpcProfileProblemKind Kind, string Subject = "");
