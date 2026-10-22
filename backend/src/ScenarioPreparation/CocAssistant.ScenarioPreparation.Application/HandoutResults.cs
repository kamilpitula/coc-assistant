namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing a Handout ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum HandoutWriteOutcome
{
    Saved,
    NotFound,
    Finished,
    InvalidTitle,
    InvalidKind,
    InvalidVisibility,
    MissingContent,
    InvalidContent,
}

/// <summary>The Handout when <see cref="HandoutWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record HandoutWriteResult(HandoutWriteOutcome Outcome, HandoutView? Handout);

/// <summary>How removing a Handout ended; NotPrepared covers an Active or Finished Scene.</summary>
public enum HandoutRemoveOutcome
{
    Removed,
    NotFound,
    NotPrepared,
}

/// <summary>How reordering a Scene's Handouts ended.</summary>
public enum HandoutReorderOutcome
{
    Reordered,
    NotFound,
    Finished,
    DuplicateIds,
    DoesNotMatchHandouts,
}

/// <summary>The Scene's Handouts in their new order when <see cref="HandoutReorderOutcome.Reordered"/>, otherwise null.</summary>
public sealed record HandoutReorderResult(HandoutReorderOutcome Outcome, IReadOnlyList<HandoutSummaryView>? Handouts);
