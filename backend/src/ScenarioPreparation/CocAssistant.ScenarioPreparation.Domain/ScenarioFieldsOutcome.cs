namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a Scenario's Title and Keeper notes were accepted, and which field was refused otherwise.</summary>
public enum ScenarioFieldsOutcome
{
    Accepted,
    InvalidTitle,
    InvalidKeeperNotes,
}
