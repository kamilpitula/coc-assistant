namespace CocAssistant.ScenarioPreparation.Domain;

internal static class ProfilePaths
{
    /// <summary>The request path of one field of a list row, such as <c>skills[2].name</c> (ADR 0018).</summary>
    public static string Row(string list, int index, string field) => $"{list}[{index}].{field}";
}
