namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The server-owned copy of each Scene link problem (ADR 0018), specified in specs/scenario-preparation/ux.md section 36. The
/// 400 keys are the camelCase request paths.
/// </summary>
internal static class NonPlayerEntityLinkProblemMessages
{
    public const string NonPlayerEntityKey = "nonPlayerEntity";
    public const string PlayerFacingNameKey = "playerFacingName";
    public const string PlayerFacingDescriptionKey = "playerFacingDescription";

    /// <summary>One message for a missing, unknown, wrong-type, or foreign entity, so nothing leaks about other Campaigns.</summary>
    public const string NonPlayerEntity = "Choose a Non-Player Entity from this Campaign.";

    public const string PlayerFacingDescription = "This Player-facing description can't be saved. Shorten it or remove unsupported content.";

    /// <summary>The 409 title of a refused profile delete (specs/scenario-preparation/spec.md).</summary>
    public const string LinkedToPlayedSceneTitle = "A Non-Player Entity linked to an Active or Finished Scene can't be deleted.";

    /// <summary>Too long names get their own message; an empty or blank name asks for one.</summary>
    public static string PlayerFacingName(string? submittedName) =>
        (submittedName?.Trim().Length ?? 0) > NonPlayerEntityLink.PlayerFacingNameMaxLength
            ? $"Player-facing name must be {NonPlayerEntityLink.PlayerFacingNameMaxLength} characters or fewer."
            : "Enter a Player-facing name.";
}
