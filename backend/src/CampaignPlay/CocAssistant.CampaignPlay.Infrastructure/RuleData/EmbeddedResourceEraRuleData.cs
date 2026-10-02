namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Rule data for one Era, read once from catalogs embedded from docs/game-rules/catalogs (ADR 0006).
/// </summary>
public sealed class EmbeddedResourceEraRuleData : IEraRuleData
{
    /// <summary>Logical name of the embedded docs/game-rules/catalogs/occupations.1920s.json.</summary>
    public const string Occupations1920sResourceName = "GameRules.Catalogs.occupations.1920s.json";

    private readonly Lazy<OccupationCatalog> _occupations;

    public EmbeddedResourceEraRuleData(Era era, string occupationsResourceName)
    {
        Era = era;
        _occupations = new Lazy<OccupationCatalog>(() => LoadOccupations(era, occupationsResourceName));
    }

    public Era Era { get; }

    public OccupationCatalog Occupations => _occupations.Value;

    public static EmbeddedResourceEraRuleData For1920s() => new(Era.The1920s, Occupations1920sResourceName);

    private static OccupationCatalog LoadOccupations(Era era, string resourceName)
    {
        using var stream = typeof(EmbeddedResourceEraRuleData).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"The embedded catalog '{resourceName}' is missing.");
        return OccupationCatalogReader.Read(stream, era);
    }
}
