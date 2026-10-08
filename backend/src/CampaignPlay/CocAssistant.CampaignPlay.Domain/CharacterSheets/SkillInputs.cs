namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// A skill, optionally with its specialization (docs/game-rules/coc7_character_creation_and_development_rules.md
/// section 6). Names compare without regard to case.
/// </summary>
public sealed record SkillReference(string Skill, string? Specialization = null)
{
    public const string CreditRatingName = "Credit Rating";
    public const string CthulhuMythosName = "Cthulhu Mythos";

    public static readonly SkillReference CreditRating = new(CreditRatingName);
    public static readonly SkillReference CthulhuMythos = new(CthulhuMythosName);

    /// <summary>"Skill (Specialization)", or "Skill: Specialization" when the skill name already ends in parentheses.</summary>
    public string DisplayName =>
        Specialization is null ? Skill
        : Skill.EndsWith(')') ? $"{Skill}: {Specialization}"
        : $"{Skill} ({Specialization})";

    public bool Equals(SkillReference? other) =>
        other is not null
        && string.Equals(Skill, other.Skill, StringComparison.OrdinalIgnoreCase)
        && string.Equals(Specialization, other.Specialization, StringComparison.OrdinalIgnoreCase);

    public override int GetHashCode() =>
        HashCode.Combine(Skill.ToUpperInvariant(), Specialization?.ToUpperInvariant());

    /// <summary>True when the skill name is <paramref name="skill"/>, whatever the specialization.</summary>
    public bool IsSkill(string skill) => string.Equals(Skill, skill, StringComparison.OrdinalIgnoreCase);
}

/// <summary>Occupation and personal interest points the Player puts on one skill (sections 7.2 and 8).</summary>
public sealed record SkillAllocation(SkillReference Skill, int? OccupationPoints, int? PersonalInterestPoints);

/// <summary>A Quick Fire value assigned to an occupation skill or Credit Rating (section 18).</summary>
public sealed record QuickFireSkillValue(SkillReference Skill, int? Value);

/// <summary>
/// The Quick Fire skill assignment (section 18): final values for Credit Rating and the occupation skills, the personal
/// interest skills, and the extra skill that takes the value Credit Rating frees (the section 18 project assumption).
/// </summary>
public sealed record QuickFireSkills(IReadOnlyList<QuickFireSkillValue> Values, IReadOnlyList<SkillReference> PersonalInterests, SkillReference? ExtraSkill = null)
{
    public static readonly QuickFireSkills Empty = new([], []);

    public bool IsEmpty => Values.Count == 0 && PersonalInterests.Count == 0 && ExtraSkill is null;

    public bool Equals(QuickFireSkills? other) =>
        other is not null
        && Values.SequenceEqual(other.Values)
        && PersonalInterests.SequenceEqual(other.PersonalInterests)
        && Equals(ExtraSkill, other.ExtraSkill);

    public override int GetHashCode() => HashCode.Combine(Values.Count, PersonalInterests.Count, ExtraSkill);
}

/// <summary>A Player-defined Occupation the Keeper judges during review (specs/character-sheet/spec.md, Occupation).</summary>
public sealed record CustomOccupation(
    string? Name,
    string? FormulaId,
    IReadOnlyList<SkillReference?> Skills,
    int? CreditRatingMin,
    int? CreditRatingMax)
{
    public bool Equals(CustomOccupation? other) =>
        other is not null
        && Name == other.Name
        && FormulaId == other.FormulaId
        && Skills.SequenceEqual(other.Skills)
        && CreditRatingMin == other.CreditRatingMin
        && CreditRatingMax == other.CreditRatingMax;

    public override int GetHashCode() => HashCode.Combine(Name, FormulaId, Skills.Count, CreditRatingMin, CreditRatingMax);
}

/// <summary>
/// The Player's Occupation: a catalog Occupation or a custom one, the characteristic chosen for each formula term that
/// offers several (section 7.1), and the skills picked for each occupation skill slot (section 7.2).
/// </summary>
public sealed record OccupationSelection(
    string? CatalogId,
    CustomOccupation? Custom,
    IReadOnlyList<string?> FormulaCharacteristics,
    IReadOnlyList<IReadOnlyList<SkillReference>> SkillChoices)
{
    public bool Equals(OccupationSelection? other) =>
        other is not null
        && CatalogId == other.CatalogId
        && Equals(Custom, other.Custom)
        && FormulaCharacteristics.SequenceEqual(other.FormulaCharacteristics)
        && SkillChoices.Count == other.SkillChoices.Count
        && SkillChoices.Zip(other.SkillChoices).All(pair => pair.First.SequenceEqual(pair.Second));

    public override int GetHashCode() => HashCode.Combine(CatalogId, Custom, FormulaCharacteristics.Count, SkillChoices.Count);
}
