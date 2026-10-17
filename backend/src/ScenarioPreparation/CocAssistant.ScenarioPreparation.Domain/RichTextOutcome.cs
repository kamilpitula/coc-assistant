namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>The result of validating a rich-text document (ADR 0015) and which kind of problem refused it.</summary>
public enum RichTextOutcome
{
    Accepted,
    TooLarge,
    Malformed,
    DisallowedContent,
}
