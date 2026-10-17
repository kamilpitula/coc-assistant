namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a Scene's fields were accepted, and which field or rule refused them otherwise.</summary>
public enum SceneFieldsOutcome
{
    Accepted,
    InvalidTitle,
    InvalidLocation,
    InvalidKeeperNotes,
    SceneFinished,
}
