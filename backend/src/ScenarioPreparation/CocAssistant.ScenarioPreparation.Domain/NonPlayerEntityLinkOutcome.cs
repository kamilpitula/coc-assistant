namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a change to a Scene's Non-Player Entity links was accepted, and which rule refused it otherwise.</summary>
public enum NonPlayerEntityLinkOutcome
{
    Accepted,
    SceneFinished,
    LinkNotFound,
    NonPlayerEntityNotInCampaign,
    InvalidPlayerFacingName,
    InvalidPlayerFacingDescription,
}
