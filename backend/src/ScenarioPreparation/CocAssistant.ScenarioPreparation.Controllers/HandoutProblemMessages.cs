namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The server-owned copy of each Handout problem (ADR 0018), specified in specs/scenario-preparation/ux.md sections 40 to 49.
/// The 400 keys are the camelCase request paths.
/// </summary>
internal static class HandoutProblemMessages
{
    public const string TitleKey = "title";
    public const string KindKey = "kind";
    public const string VisibilityKey = "visibility";
    public const string ContentKey = "content";
    public const string HandoutIdsKey = "handoutIds";

    public const string Kind = "Choose Read-aloud or Text.";
    public const string KindChangeNotAllowed = "A Handout's kind can change only between Read-aloud and Text, or between Image and Map.";
    public const string Visibility = "Choose who can see this Handout.";
    public const string MissingContent = "Enter the Handout text.";
    public const string InvalidContent = "This text can't be saved. Shorten it or remove unsupported content.";
    public const string DuplicateIds = "The Handout ids must not repeat.";

    /// <summary>The 409 title of a refused delete on an Active or Finished Scene.</summary>
    public const string NotPreparedTitle = "Only a Handout on a Prepared Scene can be deleted.";

    /// <summary>The 409 title of a reorder that does not match the Scene's current Handouts.</summary>
    public const string StaleOrderTitle = "The order does not match the Scene's current Handouts.";

    /// <summary>Too long titles get their own message; an empty or blank title asks for one.</summary>
    public static string Title(string? submittedTitle) =>
        (submittedTitle?.Trim().Length ?? 0) > Handout.TitleMaxLength
            ? $"Title must be {Handout.TitleMaxLength} characters or fewer."
            : "Enter a title.";
}
