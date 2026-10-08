namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// Maps the Backstory, Key Connection, Custom Weapons, and Gear between the wire and the domain
/// (specs/character-sheet/spec.md, API Contracts). Backstory keys are camelCase: myStory and the section 12 Background
/// entries; a blank text reads as not filled in.
/// </summary>
public static class BackstoryWireFormat
{
    public const string MyStoryKey = "myStory";
    public const int TextLengthMax = 2000;
    public const int WeaponCountMax = 20;
    public const int WeaponTextLengthMax = 100;

    private static readonly IReadOnlyDictionary<string, BackstoryEntry> EntriesByKey =
        Enum.GetValues<BackstoryEntry>().ToDictionary(KeyOf, entry => entry, StringComparer.Ordinal);

    public static string KeyOf(BackstoryEntry entry) => JsonNamingPolicy.CamelCase.ConvertName(entry.ToString());

    public static bool IsKey(string key) => key == MyStoryKey || EntriesByKey.ContainsKey(key);

    /// <summary>True when there is no Key Connection, or it names a Background entry the request fills in.</summary>
    public static bool HasValidKeyConnection(CharacterSheetRequest request) =>
        request.KeyConnection is not { } key
        || (EntriesByKey.ContainsKey(key) && !string.IsNullOrWhiteSpace(request.Backstory?.GetValueOrDefault(key)));

    public static BackstoryAndPossessions ToDomain(CharacterSheetRequest request)
    {
        var texts = request.Backstory ?? [];
        var entries = EntriesByKey
            .Where(pair => !string.IsNullOrWhiteSpace(texts.GetValueOrDefault(pair.Key)))
            .ToDictionary(pair => pair.Value, pair => texts[pair.Key]!);
        return new BackstoryAndPossessions(
            new Backstory(Filled(texts.GetValueOrDefault(MyStoryKey)), entries),
            request.KeyConnection is { } key ? EntriesByKey[key] : null,
            (request.Weapons ?? [])
                .Select(weapon => new CustomWeapon(weapon.Name, weapon.Skill, weapon.Damage, weapon.Attacks, weapon.Range, weapon.Ammo, weapon.Malfunction))
                .ToList(),
            Filled(request.Gear));
    }

    /// <summary>Every Backstory key with its text, or null when not filled in.</summary>
    public static IReadOnlyDictionary<string, string?> ToBackstoryResponse(Backstory backstory) =>
        new[] { KeyValuePair.Create(MyStoryKey, backstory.MyStory) }
            .Concat(EntriesByKey.Select(pair => KeyValuePair.Create(pair.Key, backstory[pair.Value])))
            .ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);

    public static CustomWeaponResponse ToWeaponResponse(CustomWeapon weapon) =>
        new(weapon.Name, weapon.Skill, weapon.Damage, weapon.Attacks, weapon.Range, weapon.Ammo, weapon.Malfunction, IsCustom: true);

    private static string? Filled(string? text) => string.IsNullOrWhiteSpace(text) ? null : text;
}
