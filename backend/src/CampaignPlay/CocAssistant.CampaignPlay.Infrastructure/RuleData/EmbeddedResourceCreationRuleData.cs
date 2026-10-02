namespace CocAssistant.CampaignPlay.Infrastructure.RuleData;

/// <summary>
/// Creation rule data for every Era, read once from catalogs embedded from docs/game-rules/catalogs
/// (ADR 0006 and its amendment).
/// </summary>
public sealed class EmbeddedResourceCreationRuleData : ICreationRuleData
{
    /// <summary>Logical name of the embedded docs/game-rules/catalogs/age-rules.json.</summary>
    public const string AgeRulesResourceName = "GameRules.Catalogs.age-rules.json";

    /// <summary>Logical name of the embedded docs/game-rules/catalogs/characteristics-rules.json.</summary>
    public const string CharacteristicsRulesResourceName = "GameRules.Catalogs.characteristics-rules.json";

    private readonly Lazy<AgeRules> _ageRules = new(() => Load(AgeRulesResourceName, CreationRuleCatalogReader.ReadAgeRules));

    private readonly Lazy<CharacteristicsRules> _characteristicsRules =
        new(() => Load(CharacteristicsRulesResourceName, CreationRuleCatalogReader.ReadCharacteristicsRules));

    public AgeRules AgeRules => _ageRules.Value;

    public CharacteristicsRules CharacteristicsRules => _characteristicsRules.Value;

    private static T Load<T>(string resourceName, Func<Stream, T> read)
    {
        using var stream = typeof(EmbeddedResourceCreationRuleData).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"The embedded catalog '{resourceName}' is missing.");
        return read(stream);
    }
}
