namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing an Item ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum ItemWriteOutcome
{
    Saved,
    NotFound,
    InvalidName,
    MissingDescription,
    InvalidDescription,
    InvalidKeeperNotes,
}

/// <summary>The Item when <see cref="ItemWriteOutcome.Saved"/>, otherwise null.</summary>
public sealed record ItemWriteResult(ItemWriteOutcome Outcome, ItemView? Item);

/// <summary>How deleting an Item ended. The played-Scene refusal is reported before the held refusal.</summary>
public enum ItemDeleteOutcome
{
    Deleted,
    NotFound,
    LinkedToPlayedScene,
    Held,
}
