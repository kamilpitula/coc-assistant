namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>The input to the percentile roll resolver: the target, the Difficulty, the dice, and the faces to resolve.</summary>
public sealed record PercentileRollInput(
    int TargetValue,
    Difficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    int UnitsFace,
    IReadOnlyList<int> TensFaces);

/// <summary>
/// A resolved percentile roll: the input, the regular, hard, and extreme targets, the kept tens die, the read result,
/// and its Success Level (docs/game-rules/coc7_skill_rolls_rules.md sections 1-5).
/// </summary>
public sealed record PercentileRoll(
    int TargetValue,
    int RegularTarget,
    int HardTarget,
    int ExtremeTarget,
    Difficulty Difficulty,
    int BonusDice,
    int PenaltyDice,
    int UnitsFace,
    IReadOnlyList<int> TensFaces,
    int KeptTens,
    int Result,
    SuccessLevel SuccessLevel,
    bool IsSuccess)
{
    public bool Equals(PercentileRoll? other) =>
        other is not null && TargetsEqual(other) && DiceEqual(other) && OutcomeEqual(other);

    private bool TargetsEqual(PercentileRoll other) =>
        TargetValue == other.TargetValue
        && RegularTarget == other.RegularTarget
        && HardTarget == other.HardTarget
        && ExtremeTarget == other.ExtremeTarget;

    private bool DiceEqual(PercentileRoll other) =>
        Difficulty == other.Difficulty
        && BonusDice == other.BonusDice
        && PenaltyDice == other.PenaltyDice
        && UnitsFace == other.UnitsFace
        && TensFaces.SequenceEqual(other.TensFaces);

    private bool OutcomeEqual(PercentileRoll other) =>
        KeptTens == other.KeptTens
        && Result == other.Result
        && SuccessLevel == other.SuccessLevel
        && IsSuccess == other.IsSuccess;

    public override int GetHashCode() =>
        HashCode.Combine(TargetValue, Difficulty, UnitsFace, KeptTens, Result, SuccessLevel, IsSuccess, TensFaces.Count);
}
