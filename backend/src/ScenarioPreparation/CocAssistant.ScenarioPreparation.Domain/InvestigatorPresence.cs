namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// A child of a Scene that names one Investigator present (CONTEXT.md, Investigators present). The Investigator id is not
/// interpreted here and has no foreign key, because Investigators live in another database (ADR 0013, ADR 0024).
/// </summary>
public class InvestigatorPresence
{
    public Guid SceneId { get; private set; }
    public Guid InvestigatorId { get; private set; }

    private InvestigatorPresence()
    {
    }

    private InvestigatorPresence(Guid sceneId, Guid investigatorId)
    {
        SceneId = sceneId;
        InvestigatorId = investigatorId;
    }

    internal static InvestigatorPresence Create(Guid sceneId, Guid investigatorId) => new(sceneId, investigatorId);
}
