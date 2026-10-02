namespace CocAssistant.CampaignPlay.Application;

/// <summary>How an Investigator use case ended; controllers map each outcome to one HTTP result.</summary>
public enum InvestigatorCommandOutcome
{
    Succeeded,

    /// <summary>The Investigator or Campaign is outside the caller's visibility.</summary>
    NotFound,

    /// <summary>The Investigator's status does not allow the action, or a concurrent change won.</summary>
    StatusConflict,

    /// <summary>The Character Sheet still has errors.</summary>
    ValidationFailed,

    /// <summary>The Player already has an Investigator in the Campaign.</summary>
    AlreadyExists,

    /// <summary>The Campaign allows no Creation Method the application supports yet.</summary>
    CreationMethodsUnavailable,

    /// <summary>The Change Request comment is missing or too long.</summary>
    InvalidChangeRequestComment,
}

public sealed record InvestigatorResult(
    InvestigatorCommandOutcome Outcome,
    Investigator? Investigator = null,
    IReadOnlyList<ValidationError>? ValidationErrors = null);

/// <summary>An Investigator with its computed Character Sheet values, its problems, and its Player's name.</summary>
public sealed record CharacterSheetView(
    Investigator Investigator,
    string? PlayerName,
    CharacterSheetComputation Computation,
    IReadOnlyList<ValidationError> ValidationErrors);

public sealed record CharacterSheetResult(InvestigatorCommandOutcome Outcome, CharacterSheetView? View = null);

/// <summary>A row of the Keeper's Investigator list.</summary>
public sealed record InvestigatorListItem(Investigator Investigator, string? PlayerName);
