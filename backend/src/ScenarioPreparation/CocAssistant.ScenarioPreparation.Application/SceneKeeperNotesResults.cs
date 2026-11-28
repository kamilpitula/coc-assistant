namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How saving a Scene's Keeper notes ended. MissingNotesVersion means no version was named at all.</summary>
public enum SceneKeeperNotesWriteOutcome
{
    Saved,
    NotFound,
    MissingNotesVersion,
    StaleNotesVersion,
    InvalidKeeperNotes,
}

/// <summary>The saved or current notes when the outcome carries them, otherwise null.</summary>
public sealed record SceneKeeperNotesWriteResult(SceneKeeperNotesWriteOutcome Outcome, SceneKeeperNotesView? Notes);
