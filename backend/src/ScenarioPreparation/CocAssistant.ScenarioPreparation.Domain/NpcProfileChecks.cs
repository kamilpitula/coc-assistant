namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Small checks shared by the section validators; each returns the problems it found.</summary>
internal static class NpcProfileChecks
{
    public static IEnumerable<NpcProfileProblem> PlainText(string path, string? value) =>
        value is { Length: > NpcProfileLimits.PlainTextMaxLength }
            ? [new NpcProfileProblem(path, NpcProfileProblemKind.TextTooLong)]
            : [];

    public static IEnumerable<NpcProfileProblem> RowText(string path, string? value) =>
        value is { Length: > NpcProfileLimits.RowTextMaxLength }
            ? [new NpcProfileProblem(path, NpcProfileProblemKind.RowTextTooLong)]
            : [];

    public static IEnumerable<NpcProfileProblem> TooManyRows(string path) => [new NpcProfileProblem(path, NpcProfileProblemKind.TooManyRows)];
}
