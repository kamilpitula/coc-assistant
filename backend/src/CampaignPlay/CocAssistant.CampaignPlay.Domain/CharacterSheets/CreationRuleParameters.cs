namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Point Buy parameters: docs/game-rules/coc7_character_creation_and_development_rules.md section 2.2.</summary>
public static class PointBuyRules
{
    public const int Budget = 460;
    public const int Minimum = 15;
    public const int Maximum = 90;

    /// <summary>The recommended (not required) minimum for the characteristics in <see cref="RecommendationApplies"/>.</summary>
    public const int RecommendedMinimum = 40;

    public static readonly IReadOnlyList<Characteristic> RecommendationApplies = [Characteristic.Intelligence, Characteristic.Size];
}

/// <summary>Investigator age at creation: docs/game-rules/project_ruleset.md section 4.1 (house rule).</summary>
public static class InvestigatorAgeRange
{
    public const int Minimum = 15;
    public const int Maximum = 89;

    public static bool Contains(int age) => age is >= Minimum and <= Maximum;
}

/// <summary>Characteristic floor after age effects: docs/game-rules/project_ruleset.md section 4.4 (house rule).</summary>
public static class CharacteristicFloor
{
    public const int Value = 0;
}

/// <summary>The range of Credit Rating values: docs/game-rules/coc7_character_creation_and_development_rules.md section 7.3.</summary>
public static class CreditRatingRange
{
    public const int Minimum = 0;
    public const int Maximum = 99;

    public static bool Contains(int value) => value is >= Minimum and <= Maximum;
}

/// <summary>A custom Occupation's number of occupation skills (section 18: eight occupation skills; ux.md section 6.4).</summary>
public static class CustomOccupationRules
{
    public const int SkillCount = 8;
}

/// <summary>The "skill above 90" warning: app-level advice, not a rule (specs/character-sheet/ux.md section 12).</summary>
public static class SkillValueWarning
{
    public const int Threshold = 90;
}
