namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The server-owned copy of each Item problem (ADR 0018), specified in specs/scenario-preparation/ux.md sections 62 to 65. The 400
/// keys are the camelCase request paths.
/// </summary>
internal static class ItemProblemMessages
{
    public const string NameKey = "name";
    public const string PlayerFacingDescriptionKey = "playerFacingDescription";
    public const string KeeperNotesKey = "keeperNotes";
    public const string ItemIdKey = "itemId";

    public const string MissingDescription = "Enter a Player-facing description.";

    public const string ItemNotInCampaign = "Choose an Item of this Campaign.";

    /// <summary>The 409 title of a refused Item delete while a linked Scene is Active or Finished.</summary>
    public const string LinkedToPlayedSceneTitle = "An Item linked to an Active or Finished Scene can't be deleted.";

    /// <summary>The 409 title of a refused Item delete while an Investigator holds the Item.</summary>
    public const string HeldTitle = "An Item held by an Investigator can't be deleted.";

    /// <summary>The 409 title of a refused Item Handout delete while the Item is in play.</summary>
    public const string HandoutsKeptTitle = "An Item linked to an Active or Finished Scene, or held by an Investigator, keeps its Handouts.";

    public static readonly string InvalidDescription =
        $"The Player-facing description must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes.";

    public static readonly string InvalidKeeperNotes =
        $"The Keeper notes must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes.";

    /// <summary>Too long names get their own message; an empty or blank name asks for one.</summary>
    public static string Name(string? submittedName) =>
        (submittedName?.Trim().Length ?? 0) > Item.NameMaxLength
            ? $"Name must be {Item.NameMaxLength} characters or fewer."
            : "Enter a name.";
}
