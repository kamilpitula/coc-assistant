namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Whether a Keeper notes save may proceed: version first, then the rich text (ADR 0037).</summary>
public enum KeeperNotesSaveOutcome
{
    Accepted,
    StaleNotesVersion,
    InvalidKeeperNotes,
}
