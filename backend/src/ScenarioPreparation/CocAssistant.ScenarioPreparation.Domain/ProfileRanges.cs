namespace CocAssistant.ScenarioPreparation.Domain;

internal static class ProfileRanges
{
    public static bool InRange(int? value, int minimum, int maximum) => value is { } number && number >= minimum && number <= maximum;
}
