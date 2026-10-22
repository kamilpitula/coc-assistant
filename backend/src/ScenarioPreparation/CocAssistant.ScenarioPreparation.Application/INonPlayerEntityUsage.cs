namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port that answers one cross-aggregate question for the profile services: is a Non-Player Entity linked to a
/// Scene that is being or has been played (specs/scenario-preparation/spec.md, DELETE 409). Implemented by Infrastructure.
/// </summary>
public interface INonPlayerEntityUsage
{
    /// <summary>True when a link to the entity exists on an Active or Finished Scene of the Campaign.</summary>
    Task<bool> IsLinkedToPlayedSceneAsync(Guid campaignId, NonPlayerEntityType type, Guid nonPlayerEntityId, CancellationToken cancellationToken);
}
