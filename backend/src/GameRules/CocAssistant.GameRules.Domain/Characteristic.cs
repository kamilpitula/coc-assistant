namespace CocAssistant.GameRules.Domain;

/// <summary>
/// The eight core characteristics (docs/game-rules/coc7_character_creation_and_development_rules.md section 2),
/// in the order of that section.
/// </summary>
public enum Characteristic
{
    Strength,
    Constitution,
    Dexterity,
    Appearance,
    Power,
    Size,
    Intelligence,
    Education,
}

/// <summary>Maps characteristics to the codes the rules use (STR, CON, ...), which are also their wire and storage names.</summary>
public static class CharacteristicCodes
{
    private static readonly IReadOnlyDictionary<Characteristic, string> Codes = new Dictionary<Characteristic, string>
    {
        [Characteristic.Strength] = "STR",
        [Characteristic.Constitution] = "CON",
        [Characteristic.Dexterity] = "DEX",
        [Characteristic.Appearance] = "APP",
        [Characteristic.Power] = "POW",
        [Characteristic.Size] = "SIZ",
        [Characteristic.Intelligence] = "INT",
        [Characteristic.Education] = "EDU",
    };

    /// <summary>All characteristics in rule order.</summary>
    public static readonly IReadOnlyList<Characteristic> All = Enum.GetValues<Characteristic>();

    public static string ToCode(this Characteristic characteristic) => Codes[characteristic];

    public static bool TryParse(string? code, out Characteristic characteristic)
    {
        var match = Codes.Where(entry => entry.Value == code).Select(entry => (Characteristic?)entry.Key).SingleOrDefault();
        characteristic = match ?? default;
        return match is not null;
    }
}
