namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The type of a Non-Player Entity. It is fixed by the table the entity is stored in and never changes
/// (specs/scenario-preparation/spec.md, Regression Guardrails).
/// </summary>
public enum NonPlayerEntityType
{
    HumanNpc,
    MythosCreature,
}
