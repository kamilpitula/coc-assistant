namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing a Human NPC ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum HumanNpcWriteOutcome
{
    Saved,
    NotFound,
    Invalid,
}

/// <summary>The Human NPC when <see cref="HumanNpcWriteOutcome.Saved"/>; the refused values when Invalid.</summary>
public sealed record HumanNpcWriteResult(HumanNpcWriteOutcome Outcome, IReadOnlyList<NpcProfileProblem> Problems, HumanNpcView? HumanNpc);

/// <summary>How deleting a Human NPC ended.</summary>
public enum HumanNpcDeleteOutcome
{
    Deleted,
    NotFound,
}
