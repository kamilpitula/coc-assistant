namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Small checks shared by the Monster Profile section validators; each returns the problems it found.</summary>
internal static class MonsterProfileChecks
{
    public static IEnumerable<MonsterProfileProblem> PlainText(string path, string? value) =>
        value is { Length: > ProfileLimits.PlainTextMaxLength }
            ? [new MonsterProfileProblem(path, MonsterProfileProblemKind.TextTooLong)]
            : [];

    public static IEnumerable<MonsterProfileProblem> RowText(string path, string? value) =>
        value is { Length: > ProfileLimits.RowTextMaxLength }
            ? [new MonsterProfileProblem(path, MonsterProfileProblemKind.RowTextTooLong)]
            : [];

    public static IEnumerable<MonsterProfileProblem> TooManyRows(string path) =>
        [new MonsterProfileProblem(path, MonsterProfileProblemKind.TooManyRows)];

    /// <summary>Row text that must be present: the required problem when blank, otherwise the length check.</summary>
    public static IEnumerable<MonsterProfileProblem> RequiredRowText(string path, string? value, MonsterProfileProblemKind required) =>
        value is null ? [new MonsterProfileProblem(path, required)] : RowText(path, value);

    /// <summary>A number that must be present and within the range.</summary>
    public static IEnumerable<MonsterProfileProblem> RequiredInRange(string path, int? value, int minimum, int maximum, MonsterProfileProblemKind kind) =>
        ProfileRanges.InRange(value, minimum, maximum) ? [] : [new MonsterProfileProblem(path, kind)];

    /// <summary>A number that may be absent but, when present, must be within the range.</summary>
    public static IEnumerable<MonsterProfileProblem> OptionalInRange(string path, int? value, int minimum, int maximum, MonsterProfileProblemKind kind) =>
        value is null ? [] : RequiredInRange(path, value, minimum, maximum, kind);

    /// <summary>The rows of a list within the 100-row limit, validated one by one, or a single too-many-rows problem.</summary>
    public static IEnumerable<MonsterProfileProblem> Rows<T>(string path, IReadOnlyList<T>? rows, Func<T, int, IEnumerable<MonsterProfileProblem>> validateRow)
    {
        if (rows is null)
        {
            return [];
        }

        return rows.Count > ProfileLimits.MaxRows ? TooManyRows(path) : rows.SelectMany(validateRow);
    }
}
