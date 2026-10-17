namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing a Scene ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum SceneWriteOutcome
{
    Saved,
    NotFound,
    InvalidTitle,
    InvalidLocation,
    InvalidKeeperNotes,
    Finished,
}

/// <summary>The Scene when <see cref="SceneWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record SceneWriteResult(SceneWriteOutcome Outcome, SceneDetailView? Scene);

/// <summary>How removing a Scene ended.</summary>
public enum SceneRemoveOutcome
{
    Removed,
    NotFound,
    NotPrepared,
}

/// <summary>How reordering a Scenario's Scenes ended.</summary>
public enum SceneReorderOutcome
{
    Reordered,
    NotFound,
    DuplicateIds,
    DoesNotMatchScenes,
}

/// <summary>The Scenario's Scenes in the new order when <see cref="SceneReorderOutcome.Reordered"/>, otherwise null.</summary>
public sealed record SceneReorderResult(SceneReorderOutcome Outcome, IReadOnlyList<SceneSummaryView>? Scenes);
