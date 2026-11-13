namespace CocAssistant.GameRules.Domain.Dice;

/// <summary>
/// Resolves a percentile roll over caller-supplied faces and rolls one with an IDiceRoller (specs/dice/spec.md; the rules come
/// from docs/game-rules/coc7_skill_rolls_rules.md sections 1-5, cited below). It references no Campaign, Account, Investigator,
/// Scene, or skill type.
/// </summary>
public static class PercentileRolling
{
    private const int TensSides = 10;
    private const int MaxNetDice = 2;

    /// <summary>
    /// Resolves the kept result and its Success Level from the faces. One Bonus Die cancels one Penalty Die; at most two net
    /// dice apply (section 5). The tens faces are the mapped tens values {0, 10, ..., 90} and the units face is 0-9 (section 1).
    /// </summary>
    public static PercentileRoll Resolve(PercentileRollInput input)
    {
        var regularTarget = input.TargetValue;
        var hardTarget = input.TargetValue / 2;
        var extremeTarget = input.TargetValue / 5;
        var keptTens = KeepTens(input.TensFaces, NetDice(input.BonusDice, input.PenaltyDice));
        var result = ReadResult(keptTens, input.UnitsFace);
        var level = ResolveLevel(result, input.TargetValue, RequiredTarget(input.Difficulty, regularTarget, hardTarget, extremeTarget));
        return new PercentileRoll(
            input.TargetValue,
            regularTarget,
            hardTarget,
            extremeTarget,
            input.Difficulty,
            input.BonusDice,
            input.PenaltyDice,
            input.UnitsFace,
            input.TensFaces,
            keptTens,
            result,
            level,
            IsSuccess(level, input.Difficulty));
    }

    /// <summary>
    /// Rolls one units die and 1 plus the absolute net dice tens dice, then resolves. Tens dice are drawn first so the scripted
    /// faces read in display order (tens, then units). A D10 face of 10 reads as 0 (section 1).
    /// </summary>
    public static PercentileRoll Roll(IDiceRoller roller, int targetValue, Difficulty difficulty, int bonusDice, int penaltyDice)
    {
        var tensCount = 1 + Math.Abs(NetDice(bonusDice, penaltyDice));
        var tensFaces = Enumerable.Range(0, tensCount).Select(_ => ToTensFace(roller.Roll(TensSides))).ToList();
        var unitsFace = roller.Roll(TensSides) % TensSides;
        return Resolve(new PercentileRollInput(targetValue, difficulty, bonusDice, penaltyDice, unitsFace, tensFaces));
    }

    private static int NetDice(int bonusDice, int penaltyDice) =>
        Math.Clamp(bonusDice - penaltyDice, -MaxNetDice, MaxNetDice);

    private static int KeepTens(IReadOnlyList<int> tensFaces, int net) =>
        net switch
        {
            > 0 => tensFaces.Min(),
            < 0 => tensFaces.Max(),
            _ => tensFaces[0],
        };

    // Section 1: the tens die {00, 10, ..., 90} plus the units die {0, ..., 9}; "00" and "0" read as 100.
    private static int ReadResult(int tensFace, int unitsFace) =>
        tensFace + unitsFace == 0 ? 100 : tensFace + unitsFace;

    // Section 2 and 3: the target needed at the roll's Difficulty.
    private static int RequiredTarget(Difficulty difficulty, int regularTarget, int hardTarget, int extremeTarget) =>
        difficulty switch
        {
            Difficulty.Hard => hardTarget,
            Difficulty.Extreme => extremeTarget,
            _ => regularTarget,
        };

    // Section 4.3: the level reached, from best to worst; a result below the Difficulty still names the level reached.
    private static SuccessLevel ResolveLevel(int result, int targetValue, int requiredTarget)
    {
        if (result == 1)
        {
            return SuccessLevel.Critical;
        }

        if (IsFumble(result, requiredTarget))
        {
            return SuccessLevel.Fumble;
        }

        if (result <= targetValue / 5)
        {
            return SuccessLevel.Extreme;
        }

        if (result <= targetValue / 2)
        {
            return SuccessLevel.Hard;
        }

        return result <= targetValue ? SuccessLevel.Regular : SuccessLevel.Failure;
    }

    // Section 4.2: the Fumble range follows the target needed at the roll's Difficulty, not the full value.
    private static bool IsFumble(int result, int requiredTarget) =>
        requiredTarget < 50 ? result >= 96 : result == 100;

    // Section 4.3: the level meets the Difficulty; a Critical always succeeds and a Fumble never does.
    private static bool IsSuccess(SuccessLevel level, Difficulty difficulty) =>
        level switch
        {
            SuccessLevel.Critical => true,
            SuccessLevel.Fumble => false,
            SuccessLevel.Extreme => true,
            SuccessLevel.Hard => difficulty != Difficulty.Extreme,
            SuccessLevel.Regular => difficulty == Difficulty.Regular,
            _ => false,
        };

    private static int ToTensFace(int face) => face % TensSides * TensSides;
}
