namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Rule data for one Era, read once from catalogs embedded from docs/game-rules/catalogs (ADR 0006).
/// </summary>
public sealed class EmbeddedResourceEraRuleData : IEraRuleData
{
    /// <summary>Logical name of the embedded docs/game-rules/catalogs/occupations.1920s.json.</summary>
    public const string Occupations1920sResourceName = "GameRules.Catalogs.occupations.1920s.json";

    /// <summary>Logical name of the embedded docs/game-rules/catalogs/skills.1920s.json.</summary>
    public const string Skills1920sResourceName = "GameRules.Catalogs.skills.1920s.json";

    /// <summary>Logical name of the embedded docs/game-rules/catalogs/wealth.1920s.json.</summary>
    public const string Wealth1920sResourceName = "GameRules.Catalogs.wealth.1920s.json";

    private readonly Lazy<OccupationCatalog> _occupations;
    private readonly Lazy<SkillCatalog> _skills;
    private readonly Lazy<WealthTable> _wealth;

    public EmbeddedResourceEraRuleData(Era era, string occupationsResourceName, string skillsResourceName, string wealthResourceName)
    {
        Era = era;
        _occupations = new Lazy<OccupationCatalog>(() => Load(occupationsResourceName, stream => OccupationCatalogReader.Read(stream, era)));
        _skills = new Lazy<SkillCatalog>(() => Load(skillsResourceName, stream => SkillCatalogReader.ReadSkills(stream, era)));
        _wealth = new Lazy<WealthTable>(() => Load(wealthResourceName, stream => WealthTableReader.Read(stream, era)));
    }

    public Era Era { get; }

    public OccupationCatalog Occupations => _occupations.Value;

    public SkillCatalog Skills => _skills.Value;

    public WealthTable Wealth => _wealth.Value;

    public static EmbeddedResourceEraRuleData For1920s() =>
        new(Era.The1920s, Occupations1920sResourceName, Skills1920sResourceName, Wealth1920sResourceName);

    private static T Load<T>(string resourceName, Func<Stream, T> read)
    {
        using var stream = typeof(EmbeddedResourceEraRuleData).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"The embedded catalog '{resourceName}' is missing.");
        return read(stream);
    }
}
