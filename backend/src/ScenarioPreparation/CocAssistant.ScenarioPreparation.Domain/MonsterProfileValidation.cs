namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Reports every structural problem that blocks saving a Monster Profile, on the request path of the refused value
/// (docs/game-rules/project_ruleset.md sections 5.8 and 5.9; ADR 0018). The section validators are independent and none
/// stops the others; their problems are concatenated in section order.
/// </summary>
public static class MonsterProfileValidation
{
    /// <summary>Validates the name and a profile; the profile is normalized (trimmed) first.</summary>
    public static IReadOnlyList<MonsterProfileProblem> Validate(string? name, MonsterProfile profile)
    {
        var normalized = MonsterProfileNormalizer.Normalize(profile);
        return Name(name)
            .Concat(MonsterDetailsValidation.Validate(normalized.Details))
            .Concat(MonsterCharacteristicsValidation.Validate(normalized.Characteristics, normalized.Details))
            .Concat(MonsterMovementValidation.Validate(normalized.Movement))
            .Concat(MonsterCombatValidation.Validate(normalized.Combat))
            .Concat(MonsterDefensesValidation.Validate(normalized.Defenses))
            .Concat(MonsterSkillsValidation.Validate(normalized.Skills))
            .Concat(MonsterSpellsValidation.Validate(normalized.Spells, normalized.Powers))
            .Concat(MonsterSanityLossValidation.Validate(normalized.SanityLoss))
            .Concat(KeeperNotes(normalized.KeeperNotes))
            .ToList();
    }

    /// <summary>The problems with a Mythos Creature's name alone, as when it is created.</summary>
    public static IReadOnlyList<MonsterProfileProblem> Name(string? name) => ProfileText.Trimmed(name) switch
    {
        null => [new MonsterProfileProblem("name", MonsterProfileProblemKind.NameRequired)],
        { Length: > ProfileLimits.NameMaxLength } => [new MonsterProfileProblem("name", MonsterProfileProblemKind.NameTooLong)],
        _ => [],
    };

    private static IEnumerable<MonsterProfileProblem> KeeperNotes(string? keeperNotes) =>
        keeperNotes is not null && RichTextDocument.Validate(keeperNotes) != RichTextOutcome.Accepted
            ? [new MonsterProfileProblem("keeperNotes", MonsterProfileProblemKind.KeeperNotesInvalid)]
            : [];
}
