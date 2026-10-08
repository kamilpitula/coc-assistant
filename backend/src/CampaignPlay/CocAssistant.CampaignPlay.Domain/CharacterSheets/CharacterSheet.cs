namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The Player's inputs for an Investigator's Character Sheet
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 1): identity, Creation Method, assigned
/// characteristics (Point Buy and Quick Fire), the age deduction split (section 3.1), the Roll Records of every dice
/// result (including the Standard Rolling characteristic rolls of section 2.1), the Occupation (section 7), and the
/// skill allocations (sections 7.2 and 8) or the Quick Fire skill assignment (section 18). Derived values are never
/// stored; they are computed from these inputs.
/// </summary>
public sealed record CharacterSheet(
    InvestigatorIdentity Identity,
    CreationMethod? CreationMethod,
    CharacteristicValues AssignedCharacteristics,
    CharacteristicValues AgeDeductions,
    IReadOnlyList<RollRecord> RollRecords,
    OccupationSelection? Occupation,
    IReadOnlyList<SkillAllocation> SkillAllocations,
    QuickFireSkills QuickFire)
{
    /// <summary>The schema version of the stored Character Sheet (ADR 0005, ADR 0007).</summary>
    public const int CurrentSchemaVersion = 3;

    public static readonly CharacterSheet Empty =
        new(InvestigatorIdentity.Empty, null, CharacteristicValues.Empty, CharacteristicValues.Empty, [], null, [], QuickFireSkills.Empty);

    /// <summary>The raw Standard Rolling totals, read from the characteristic Roll Records.</summary>
    public CharacteristicValues CharacteristicRolls =>
        CharacteristicValues.From(CharacteristicCodes.All.Select(characteristic =>
            KeyValuePair.Create(characteristic, ResultFor(RollPurposes.Characteristic(characteristic)))));

    /// <summary>The raw Luck rolls, first then second, without trailing gaps.</summary>
    public IReadOnlyList<int?> LuckRolls =>
        TrimTrailingNulls([ResultFor(RollPurposes.Luck), ResultFor(RollPurposes.LuckSecondRoll)]);

    /// <summary>The EDU improvement check rolls, numbered from 1 up to the highest check that has any roll.</summary>
    public IReadOnlyList<EduImprovementCheckInput> EduImprovementChecks =>
        Enumerable.Range(1, HighestEduImprovementCheckNumber())
            .Select(number => new EduImprovementCheckInput(
                ResultFor(RollPurposes.EduImprovementCheck(number)),
                ResultFor(RollPurposes.EduImprovementGain(number))))
            .ToList();

    public int? ResultFor(string purpose) =>
        RollRecords.Where(record => record.Purpose == purpose).Select(record => (int?)record.Result).SingleOrDefault();

    public bool Equals(CharacterSheet? other) =>
        other is not null
        && Identity == other.Identity
        && CreationMethod == other.CreationMethod
        && AssignedCharacteristics.Equals(other.AssignedCharacteristics)
        && AgeDeductions.Equals(other.AgeDeductions)
        && RollRecords.SequenceEqual(other.RollRecords)
        && Equals(Occupation, other.Occupation)
        && SkillAllocations.SequenceEqual(other.SkillAllocations)
        && QuickFire.Equals(other.QuickFire);

    public override int GetHashCode() =>
        HashCode.Combine(Identity, CreationMethod, AssignedCharacteristics, AgeDeductions, RollRecords.Count, Occupation, SkillAllocations.Count);

    private int HighestEduImprovementCheckNumber() =>
        RollRecords
            .Select(record => RollPurposes.EduImprovementCheckNumberOf(record.Purpose))
            .OfType<int>()
            .DefaultIfEmpty(0)
            .Max();

    private static IReadOnlyList<int?> TrimTrailingNulls(IReadOnlyList<int?> values) =>
        values.Take(values.Select((value, index) => value is null ? 0 : index + 1).Max()).ToList();
}
