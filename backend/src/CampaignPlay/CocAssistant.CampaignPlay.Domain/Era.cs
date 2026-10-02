namespace CocAssistant.CampaignPlay.Domain;

/// <summary>
/// The historical period a Campaign is set in; it selects the rule data for its Character Sheets.
/// Supported Eras: docs/game-rules/project_ruleset.md section 1.
/// </summary>
public sealed record Era
{
    public static readonly Era The1920s = new("1920s");

    public static readonly IReadOnlyList<Era> Supported = [The1920s];

    private Era(string code)
    {
        Code = code;
    }

    /// <summary>The stable identifier used on the wire, in storage, and to key rule data catalogs.</summary>
    public string Code { get; }

    /// <summary>Resolves a supported Era by its exact code; false for unknown or unsupported codes.</summary>
    public static bool TryParse(string? code, [NotNullWhen(true)] out Era? era)
    {
        era = Supported.SingleOrDefault(candidate => candidate.Code == code);
        return era is not null;
    }

    public override string ToString() => Code;
}
