namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Reads request paths (ADR 0018) for the problem messages of NPC Profiles and Monster Profiles.</summary>
internal static partial class ProfileProblemPaths
{
    /// <summary>The label of the field at a path, looked up without row indexes; the path itself when there is none.</summary>
    public static string FieldLabel(IReadOnlyDictionary<string, string> labels, string path) =>
        labels.GetValueOrDefault(WithoutIndexes(path), path);

    public static string LastSegment(string path) => path[(path.LastIndexOf('.') + 1)..];

    public static string WithoutIndexes(string path) => RowIndex().Replace(path, string.Empty);

    [GeneratedRegex(@"\[\d+\]")]
    private static partial Regex RowIndex();
}
