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
    KindChangeNotAllowed,
    MissingFile,
    UnsupportedFileType,
    FileTooLarge,
    StorageFailed,
}

/// <summary>The Handout when <see cref="HandoutWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record HandoutWriteResult(HandoutWriteOutcome Outcome, HandoutView? Handout);

/// <summary>How removing a Handout ended; NotPrepared covers an Active or Finished Scene and InPlay an Item that is in play.</summary>
public enum HandoutRemoveOutcome
{
    Removed,
    NotFound,
    NotPrepared,
    InPlay,
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

/// <summary>The owner's Handouts in their new order when <see cref="HandoutReorderOutcome.Reordered"/>, otherwise null.</summary>
public sealed record HandoutReorderResult(HandoutReorderOutcome Outcome, IReadOnlyList<HandoutSummaryView>? Handouts);

/// <summary>Maps the domain's refusals of a Handout write to the application outcomes the controllers translate.</summary>
internal static class HandoutWriteOutcomes
{
    private static readonly Dictionary<HandoutOutcome, HandoutWriteOutcome> Map = new()
    {
        [HandoutOutcome.Accepted] = HandoutWriteOutcome.Saved,
        [HandoutOutcome.SceneFinished] = HandoutWriteOutcome.Finished,
        [HandoutOutcome.HandoutNotFound] = HandoutWriteOutcome.NotFound,
        [HandoutOutcome.InvalidTitle] = HandoutWriteOutcome.InvalidTitle,
        [HandoutOutcome.InvalidKind] = HandoutWriteOutcome.InvalidKind,
        [HandoutOutcome.InvalidVisibility] = HandoutWriteOutcome.InvalidVisibility,
        [HandoutOutcome.MissingContent] = HandoutWriteOutcome.MissingContent,
        [HandoutOutcome.InvalidContent] = HandoutWriteOutcome.InvalidContent,
        [HandoutOutcome.KindChangeNotAllowed] = HandoutWriteOutcome.KindChangeNotAllowed,
        [HandoutOutcome.MissingFile] = HandoutWriteOutcome.MissingFile,
        [HandoutOutcome.UnsupportedFileType] = HandoutWriteOutcome.UnsupportedFileType,
        [HandoutOutcome.FileTooLarge] = HandoutWriteOutcome.FileTooLarge,
    };

    public static HandoutWriteOutcome From(HandoutOutcome outcome) => Map[outcome];
}
