namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>How creating or editing a Mythos Creature ended. NotFound covers every case the caller may not distinguish (ADR 0013).</summary>
public enum MythosCreatureWriteOutcome
{
    Saved,
    NotFound,
    Invalid,
}

/// <summary>The Mythos Creature when <see cref="MythosCreatureWriteOutcome.Saved"/>; the refused values when Invalid.</summary>
public sealed record MythosCreatureWriteResult(
    MythosCreatureWriteOutcome Outcome,
    IReadOnlyList<MonsterProfileProblem> Problems,
    MythosCreatureView? MythosCreature);

/// <summary>How deleting a Mythos Creature ended.</summary>
public enum MythosCreatureDeleteOutcome
{
    Deleted,
    NotFound,
    LinkedToPlayedScene,
}
