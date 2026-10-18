namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Reports every structural problem that blocks saving an NPC Profile, on the request path of the refused value
/// (docs/game-rules/project_ruleset.md section 5.8; ADR 0018). The section validators are independent and none stops the
/// others; their problems are concatenated in section order.
/// </summary>
public static class NpcProfileValidation
{
    /// <summary>Validates the name and a profile; the profile is normalized (trimmed) first.</summary>
    public static IReadOnlyList<NpcProfileProblem> Validate(string? name, NpcProfile profile, CombatSkillSpecializations specializations)
    {
        var normalized = NpcProfileNormalizer.Normalize(profile);
        return Identity(name, normalized.Age)
            .Concat(NpcDetailsValidation.Validate(normalized.Details))
            .Concat(NpcCharacteristicsValidation.Validate(normalized.Characteristics))
            .Concat(NpcSkillsValidation.Validate(normalized.Skills, specializations))
            .Concat(NpcCombatValidation.Validate(normalized.Combat, normalized.Skills ?? []))
            .Concat(NpcSpellsValidation.Validate(normalized.Spells))
            .Concat(KeeperNotes(normalized.KeeperNotes))
            .ToList();
    }

    /// <summary>The problems with a Human NPC's name and age alone, as when it is created.</summary>
    public static IReadOnlyList<NpcProfileProblem> Identity(string? name, int? age) =>
        Name(NpcProfileNormalizer.Trimmed(name)).Concat(Age(age)).ToList();

    private static IEnumerable<NpcProfileProblem> Name(string? trimmedName) => trimmedName switch
    {
        null => [new NpcProfileProblem("name", NpcProfileProblemKind.NameRequired)],
        { Length: > NpcProfileLimits.NameMaxLength } => [new NpcProfileProblem("name", NpcProfileProblemKind.NameTooLong)],
        _ => [],
    };

    private static IEnumerable<NpcProfileProblem> Age(int? age) => age switch
    {
        null => [new NpcProfileProblem("age", NpcProfileProblemKind.AgeRequired)],
        < 0 or > NpcProfileLimits.AgeMaximum => [new NpcProfileProblem("age", NpcProfileProblemKind.AgeOutOfRange)],
        _ => [],
    };

    private static IEnumerable<NpcProfileProblem> KeeperNotes(string? keeperNotes) =>
        keeperNotes is not null && RichTextDocument.Validate(keeperNotes) != RichTextOutcome.Accepted
            ? [new NpcProfileProblem("keeperNotes", NpcProfileProblemKind.KeeperNotesInvalid)]
            : [];
}
