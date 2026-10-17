namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a Scene status transition happened; a refused transition changes nothing.</summary>
public enum SceneTransitionOutcome
{
    Transitioned,
    NotAllowed,
}
