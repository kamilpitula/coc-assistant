namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The Player's inputs for an Investigator's Character Sheet
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 1): identity, Creation Method, assigned
/// characteristics (Point Buy and Quick Fire), the age deduction split (section 3.1), the Roll Records of every dice
/// result (including the Standard Rolling characteristic rolls of section 2.1), the Occupation (section 7), and the
/// skill allocations (sections 7.2 and 8) or the Quick Fire skill assignment (section 18), and the Backstory, Custom
/// Weapons, and Gear (sections 11 and 12). Derived values are never stored; they are computed from these inputs.
/// </summary>
public sealed record CharacterSheet(
    InvestigatorIdentity Identity,
    CreationMethod? CreationMethod,
    CharacteristicValues AssignedCharacteristics,
    CharacteristicValues AgeDeductions,
    IReadOnlyList<RollRecord> RollRecords,
    OccupationSelection? Occupation,
    IReadOnlyList<SkillAllocation> SkillAllocations,
    QuickFireSkills QuickFire,
    BackstoryAndPossessions BackstoryAndPossessions)
{
    /// <summary>The schema version of the stored Character Sheet (ADR 0005, ADR 0007).</summary>
    public const int CurrentSchemaVersion = 6;

    public static readonly CharacterSheet Empty =
        new(InvestigatorIdentity.Empty, null, CharacteristicValues.Empty, CharacteristicValues.Empty, [], null, [], QuickFireSkills.Empty, BackstoryAndPossessions.Empty);

    /// <summary>Roll Records a re-roll grant replaced; kept for the Keeper, never counted (specs/character-sheet/spec.md, Re-roll grant).</summary>
    public IReadOnlyList<RollRecord> ReplacedRollRecords { get; init; } = [];

    /// <summary>The groups the Keeper granted that the Player has not rolled again yet.</summary>
    public IReadOnlyList<RollGroup> RerollGrants { get; init; } = [];

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

    /// <summary>Adds new Roll Records to the sheet; records already on it are never changed. Rolling a group clears only that group's open re-roll grant.</summary>
    public CharacterSheet WithAddedRollRecords(IEnumerable<RollRecord> records)
    {
        var added = records.ToList();
        return this with
        {
            RollRecords = [.. RollRecords, .. added],
            RerollGrants = [.. RerollGrants.Where(grant => added.All(record => RollPurposes.GroupOf(record.Purpose) != grant))],
        };
    }

    /// <summary>Whether the group has at least one current (not replaced) Roll Record and can be granted a re-roll.</summary>
    public bool HasCurrentRecordsIn(RollGroup group) =>
        RollRecords.Any(record => RollPurposes.GroupOf(record.Purpose) == group);

    /// <summary>
    /// Moves the groups' current Roll Records to the replaced collection, unchanged and never deleted, and opens their
    /// re-roll grants (specs/character-sheet/spec.md, Re-roll grant).
    /// </summary>
    public CharacterSheet WithRerollGranted(IReadOnlyCollection<RollGroup> grants) =>
        this with
        {
            RollRecords = RollRecords.Where(record => !IsGranted(record.Purpose, grants)).ToList(),
            ReplacedRollRecords = [.. ReplacedRollRecords, .. RollRecords.Where(record => IsGranted(record.Purpose, grants))],
            RerollGrants = [.. grants],
        };

    private static bool IsGranted(string purpose, IReadOnlyCollection<RollGroup> grants) =>
        RollPurposes.GroupOf(purpose) is { } group && grants.Contains(group);

    public bool Equals(CharacterSheet? other) =>
        other is not null
        && SheetInputsEqual(other)
        && RollRecordsEqual(other);

    private bool SheetInputsEqual(CharacterSheet other) =>
        Identity == other.Identity
        && CreationMethod == other.CreationMethod
        && AssignedCharacteristics.Equals(other.AssignedCharacteristics)
        && AgeDeductions.Equals(other.AgeDeductions)
        && Equals(Occupation, other.Occupation)
        && SkillAllocations.SequenceEqual(other.SkillAllocations)
        && QuickFire.Equals(other.QuickFire)
        && BackstoryAndPossessions.Equals(other.BackstoryAndPossessions);

    private bool RollRecordsEqual(CharacterSheet other) =>
        RollRecords.SequenceEqual(other.RollRecords)
        && ReplacedRollRecords.SequenceEqual(other.ReplacedRollRecords)
        && RerollGrants.SequenceEqual(other.RerollGrants);

    public override int GetHashCode() =>
        HashCode.Combine(
            HashCode.Combine(Identity, CreationMethod, AssignedCharacteristics, AgeDeductions),
            HashCode.Combine(RollRecords.Count, ReplacedRollRecords.Count, RerollGrants.Count, Occupation),
            HashCode.Combine(SkillAllocations.Count, QuickFire, BackstoryAndPossessions));

    private int HighestEduImprovementCheckNumber() =>
        RollRecords
            .Select(record => RollPurposes.EduImprovementCheckNumberOf(record.Purpose))
            .OfType<int>()
            .DefaultIfEmpty(0)
            .Max();

    private static IReadOnlyList<int?> TrimTrailingNulls(IReadOnlyList<int?> values) =>
        values.Take(values.Select((value, index) => value is null ? 0 : index + 1).Max()).ToList();
}
