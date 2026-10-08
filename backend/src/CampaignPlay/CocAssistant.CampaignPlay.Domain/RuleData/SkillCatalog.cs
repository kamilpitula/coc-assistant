namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>
/// A skill's base value: a fixed value, or a characteristic divided by a divisor and rounded down
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 6.1).
/// </summary>
public sealed record SkillBase(int? FixedValue, Characteristic? Characteristic, int Divisor)
{
    public static SkillBase Fixed(int value) => new(value, null, 1);

    public static SkillBase FromCharacteristic(Characteristic characteristic, int divisor) => new(null, characteristic, divisor);

    /// <summary>The base for these characteristic values, or null while its characteristic has no value.</summary>
    public int? For(CharacteristicValues characteristics) =>
        FixedValue ?? (Characteristic is { } characteristic && characteristics[characteristic] is { } value
            ? (int)Math.Floor(value / (double)Divisor)
            : null);
}

/// <summary>One skill of an Era's skill catalog.</summary>
public sealed record SkillDefinition(SkillReference Reference, SkillBase Base);

/// <summary>The skills of one Era, mirroring docs/game-rules/catalogs/skills.&lt;era&gt;.json (section 6.1).</summary>
public sealed record SkillCatalog(Era Era, IReadOnlyList<SkillDefinition> Skills)
{
    public SkillDefinition? Find(SkillReference skill) => Skills.SingleOrDefault(definition => definition.Reference.Equals(skill));
}

/// <summary>
/// Specialized skills, mirroring docs/game-rules/catalogs/skill-specializations.json (section 6.2;
/// docs/game-rules/project_ruleset.md section 4.2). Closed families take only their listed specializations, each with
/// its own base; open families take any specialization at the family's base.
/// </summary>
public sealed record SkillSpecializationCatalog(
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, int>> ClosedFamilies,
    IReadOnlyList<string> OpenFamilies)
{
    public bool IsClosedFamily(string skill) => ClosedFamilies.Keys.Any(family => SameName(family, skill));

    public bool IsOpenFamily(string skill) => OpenFamilies.Any(family => SameName(family, skill));

    /// <summary>The base of a closed family's specialization, or null when the family does not list it.</summary>
    public int? ClosedBaseFor(SkillReference skill) =>
        ClosedFamilies
            .Where(family => SameName(family.Key, skill.Skill))
            .SelectMany(family => family.Value)
            .Where(entry => skill.Specialization is not null && SameName(entry.Key, skill.Specialization))
            .Select(entry => (int?)entry.Value)
            .FirstOrDefault();

    private static bool SameName(string left, string right) => string.Equals(left, right, StringComparison.OrdinalIgnoreCase);
}
