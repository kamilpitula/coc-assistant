namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// A problem found on a Character Sheet, shaped as in
/// docs/game-rules/coc7_character_creation_and_development_rules.md section 15. Codes and messages are catalogued in
/// specs/character-sheet/spec.md (Validation).
/// </summary>
public sealed record ValidationError(
    string Code,
    string Field,
    string Message,
    string? Expected,
    string? Actual,
    ValidationSeverity Severity)
{
    public bool IsError => Severity == ValidationSeverity.Error;
}

/// <summary>An Error blocks submission; a Warning never does.</summary>
public enum ValidationSeverity
{
    Error,
    Warning,
}
