namespace CocAssistant.ScenarioPreparation.Domain;

internal static class ProfileText
{
    /// <summary>The text trimmed at both ends, or null when it is null or blank.</summary>
    public static string? Trimmed(string? text) => text?.Trim() is { Length: > 0 } trimmed ? trimmed : null;
}
