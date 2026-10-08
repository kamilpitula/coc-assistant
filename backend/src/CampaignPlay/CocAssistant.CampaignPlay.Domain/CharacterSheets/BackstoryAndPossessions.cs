namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// The Background entries of the backstory
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 12), in the order of that section.
/// </summary>
public enum BackstoryEntry
{
    PersonalDescription,
    Traits,
    IdeologyAndBeliefs,
    InjuriesAndScars,
    SignificantPeople,
    PhobiasAndManias,
    MeaningfulLocations,
    ArcaneTomesAndSpells,
    TreasuredPossessions,
    EncountersWithStrangeEntities,
}

/// <summary>The Player's Backstory: My Story and the Background entries they filled in (section 12), as free text.</summary>
public sealed record Backstory(string? MyStory, IReadOnlyDictionary<BackstoryEntry, string> Entries)
{
    public static readonly Backstory Empty = new(null, new Dictionary<BackstoryEntry, string>());

    public string? this[BackstoryEntry entry] => Entries.GetValueOrDefault(entry);

    public bool IsFilled(BackstoryEntry entry) => !string.IsNullOrWhiteSpace(this[entry]);

    public bool Equals(Backstory? other) =>
        other is not null
        && MyStory == other.MyStory
        && Entries.Count == other.Entries.Count
        && Entries.All(entry => other.Entries.TryGetValue(entry.Key, out var value) && value == entry.Value);

    public override int GetHashCode() => HashCode.Combine(MyStory, Entries.Count);
}

/// <summary>
/// A Custom Weapon: free-text details the Player enters because no weapon catalog exists. Its statistics are never
/// inferred from its name; Character Approval is the approval section 10.2 requires
/// (docs/game-rules/project_ruleset.md section 4.2).
/// </summary>
public sealed record CustomWeapon(
    string? Name,
    string? Skill,
    string? Damage,
    string? Attacks,
    string? Range,
    string? Ammo,
    string? Malfunction);

/// <summary>
/// The Backstory with its Key Connection (section 12), the Custom Weapons, and the Gear (section 11). The Key
/// Connection is optional because section 12 does not say whether it is required.
/// </summary>
public sealed record BackstoryAndPossessions(
    Backstory Backstory,
    BackstoryEntry? KeyConnection,
    IReadOnlyList<CustomWeapon> Weapons,
    string? Gear)
{
    public static readonly BackstoryAndPossessions Empty = new(Backstory.Empty, null, [], null);

    /// <summary>True when there is no Key Connection or it names a filled-in Background entry.</summary>
    public bool HasValidKeyConnection => KeyConnection is not { } entry || Backstory.IsFilled(entry);

    public bool Equals(BackstoryAndPossessions? other) =>
        other is not null
        && Backstory.Equals(other.Backstory)
        && KeyConnection == other.KeyConnection
        && Weapons.SequenceEqual(other.Weapons)
        && Gear == other.Gear;

    public override int GetHashCode() => HashCode.Combine(Backstory, KeyConnection, Weapons.Count, Gear);
}
