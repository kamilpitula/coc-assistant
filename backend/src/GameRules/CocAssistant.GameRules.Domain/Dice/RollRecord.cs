namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>Who produced a dice result.</summary>
public enum RollSource
{
    PlayerEntered,

    Server,
}

/// <summary>
/// A kept dice result: what it was rolled for, the dice, the raw total, and its source. Rolls the server makes
/// keep their faces, who asked for them, and when; results the Player entered predate that audit
/// (docs/game-rules/project_ruleset.md section 4.3). A percentile roll against a target value also keeps its resolved
/// roll and whether it earns an experience check (specs/dice/spec.md); other records leave both null.
/// </summary>
public sealed record RollRecord(
    string Purpose,
    string Dice,
    int Result,
    RollSource Source,
    IReadOnlyList<int>? Faces = null,
    Guid? RolledByAccountId = null,
    DateTimeOffset? RolledAt = null,
    PercentileRoll? Percentile = null,
    bool? EarnsExperienceCheck = null)
{
    /// <summary>A result the server rolled: it keeps the faces, who asked for it, and when.</summary>
    public static RollRecord FromServer(string purpose, DiceRoll roll, Guid rolledByAccountId, DateTimeOffset rolledAt) =>
        new(purpose, roll.Dice, roll.Total, RollSource.Server, roll.Faces, rolledByAccountId, rolledAt);

    /// <summary>A result the Player entered. Impossible results are kept and reported by validation.</summary>
    public static RollRecord PlayerEntered(string purpose, string dice, int result) =>
        new(purpose, dice, result, RollSource.PlayerEntered);

    public bool Equals(RollRecord? other) =>
        other is not null
        && Purpose == other.Purpose
        && Dice == other.Dice
        && Result == other.Result
        && Source == other.Source
        && Nullable.Equals(RolledByAccountId, other.RolledByAccountId)
        && Nullable.Equals(RolledAt, other.RolledAt)
        && FacesEqual(Faces, other.Faces)
        && Equals(Percentile, other.Percentile)
        && EarnsExperienceCheck == other.EarnsExperienceCheck;

    public override int GetHashCode() =>
        HashCode.Combine(
            HashCode.Combine(Purpose, Dice, Result, Source, RolledByAccountId, RolledAt, Faces is null ? 0 : Faces.Count),
            Percentile,
            EarnsExperienceCheck);

    private static bool FacesEqual(IReadOnlyList<int>? left, IReadOnlyList<int>? right) =>
        left is null ? right is null : right is not null && left.SequenceEqual(right);
}
