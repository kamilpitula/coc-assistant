namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The kinds of problem that block saving a Monster Profile (docs/game-rules/project_ruleset.md sections 5.8 and 5.9).</summary>
public enum MonsterProfileProblemKind
{
    NameRequired,
    NameTooLong,
    CreatureKindNotListed,
    TextTooLong,
    RowTextTooLong,
    TooManyRows,
    UnknownCharacteristic,
    CharacteristicOutOfRange,
    OverrideValueRequired,
    HitPointsOverrideOutOfRange,
    MagicPointsOverrideOutOfRange,
    BuildOverrideOutOfRange,
    DamageBonusOverrideMalformed,
    OverrideReasonRequired,
    OverrideReasonTooLong,
    HitPointsOverriddenAndNotApplicable,
    DefeatOutcomeRequired,
    MovementModeNotListed,
    MovementLabelRequired,
    MovementRateOutOfRange,
    AttacksPerRoundOutOfRange,
    DodgeOutOfRange,
    ArmorPointsOutOfRange,
    AttackNameRequired,
    AttackSkillRequired,
    AttackSkillValueOutOfRange,
    AttackDamageRequired,
    DamageMalformed,
    DamageBonusOnFirearm,
    ImmunityDescriptionRequired,
    VulnerabilityDescriptionRequired,
    SkillNameRequired,
    SkillValueOutOfRange,
    SpellNameRequired,
    PowerNameRequired,
    SanityLossMalformed,
    KeeperNotesInvalid,
}

/// <summary>One refused value: the camelCase JSON path it has in the request (ADR 0018) and the kind of problem.</summary>
public sealed record MonsterProfileProblem(string Path, MonsterProfileProblemKind Kind);
