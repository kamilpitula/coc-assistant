namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether adding or editing a Scene's Handout was accepted, and which rule refused it otherwise.</summary>
public enum HandoutOutcome
{
    Accepted,
    SceneFinished,
    HandoutNotFound,
    InvalidTitle,
    InvalidKind,
    InvalidVisibility,
    MissingContent,
    InvalidContent,
    KindChangeNotAllowed,
    MissingFile,
    UnsupportedFileType,
    FileTooLarge,
}
