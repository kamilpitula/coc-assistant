namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Validation of the age-dependent inputs: the physical deduction (section 3.1), EDU improvement checks (section 3.2),
/// Luck rolls (section 5.5), dice ranges, and the characteristic floor (project_ruleset.md section 4.4).
/// </summary>
internal static class AgeEffectsValidation
{
    public static IEnumerable<ValidationError> LuckProblems(CharacterSheet sheet, AgeBracket? bracket)
    {
        var rolls = sheet.LuckRolls;
        var first = rolls.ElementAtOrDefault(0);
        var second = rolls.ElementAtOrDefault(1);

        var firstProblems = first is null
            ? [ValidationErrors.LuckRollRequired()]
            : DiceProblems(ValidationErrors.LuckRollField(0), CreationDice.Luck, first);

        return firstProblems.Concat(SecondLuckRollProblems(second, bracket));
    }

    public static IEnumerable<ValidationError> DeductionProblems(CharacterSheet sheet, AgeBracket bracket)
    {
        var deductions = sheet.AgeDeductions;
        var perCharacteristic = deductions.Present.SelectMany(characteristic => DeductionProblem(characteristic, deductions[characteristic]!.Value, bracket));

        var deducted = deductions.Present.Sum(characteristic => deductions[characteristic]!.Value);
        var totalMismatch = deducted != bracket.PhysicalDeductionTotal
            ? [ValidationErrors.AgeDeductionTotalMismatch(bracket.PhysicalDeductionTotal, deducted)]
            : Array.Empty<ValidationError>();

        return perCharacteristic.Concat(totalMismatch);
    }

    public static IEnumerable<ValidationError> EduImprovementProblems(
        CharacterSheet sheet,
        AgeBracket bracket,
        IReadOnlyList<EduImprovementOutcome> outcomes)
    {
        var checks = sheet.EduImprovementChecks;
        var required = Enumerable.Range(0, bracket.EduImprovementChecks)
            .SelectMany(index => RequiredCheckProblems(index, checks.ElementAtOrDefault(index), outcomes.ElementAtOrDefault(index)));
        var notRequired = Enumerable.Range(bracket.EduImprovementChecks, Math.Max(0, checks.Count - bracket.EduImprovementChecks))
            .Where(index => checks[index].Check is not null || checks[index].Gain is not null)
            .Select(ValidationErrors.EduImprovementCheckNotRequired);

        return required.Concat(notRequired);
    }

    public static IEnumerable<ValidationError> FloorProblems(CharacterSheet sheet, CharacterSheetComputation computation) =>
        computation.FinalCharacteristics.Present
            .Where(characteristic => computation.FinalCharacteristics[characteristic] < CharacteristicFloor.Value)
            .Select(characteristic => ValidationErrors.CharacteristicBelowFloor(
                characteristic,
                FloorField(characteristic, sheet, computation.Bracket!),
                computation.FinalCharacteristics[characteristic]!.Value));

    private static IEnumerable<ValidationError> SecondLuckRollProblems(int? second, AgeBracket? bracket)
    {
        if (bracket is null)
        {
            return second is null ? [] : DiceProblems(ValidationErrors.LuckRollField(1), CreationDice.Luck, second);
        }

        var rollsTwice = bracket.LuckRolls >= 2;
        return (rollsTwice, second) switch
        {
            (true, null) => [ValidationErrors.LuckSecondRollRequired()],
            (false, not null) => [ValidationErrors.LuckSecondRollNotAllowed()],
            (true, not null) => DiceProblems(ValidationErrors.LuckRollField(1), CreationDice.Luck, second),
            _ => [],
        };
    }

    private static IEnumerable<ValidationError> DeductionProblem(Characteristic characteristic, int deduction, AgeBracket bracket)
    {
        if (!bracket.AllowsDeductionFrom(characteristic))
        {
            yield return ValidationErrors.AgeDeductionNotAllowed(characteristic);
        }
        else if (deduction < 0)
        {
            yield return ValidationErrors.AgeDeductionNegative(characteristic, deduction);
        }
    }

    // A gain is judged only once its check roll is a result the D100 can produce.
    private static IEnumerable<ValidationError> RequiredCheckProblems(int index, EduImprovementCheckInput? check, EduImprovementOutcome? outcome)
    {
        if (check?.Check is null)
        {
            return [ValidationErrors.EduImprovementCheckRequired(index)];
        }

        if (!CreationDice.EduImprovementCheck.CanProduce(check.Check.Value))
        {
            return DiceProblems(ValidationErrors.EduCheckRollField(index), CreationDice.EduImprovementCheck, check.Check);
        }

        return check.Gain is not null && !CreationDice.EduImprovementGain.CanProduce(check.Gain.Value)
            ? DiceProblems(ValidationErrors.EduGainField(index), CreationDice.EduImprovementGain, check.Gain)
            : GainProblems(index, check, outcome);
    }

    // Section 3.2: a roll above the current EDU needs its gain; any other roll has none.
    private static IEnumerable<ValidationError> GainProblems(int index, EduImprovementCheckInput check, EduImprovementOutcome? outcome)
    {
        if (outcome is null)
        {
            return [];
        }

        return (outcome.Improves, check.Gain) switch
        {
            (true, null) => [ValidationErrors.EduImprovementGainRequired(index)],
            (false, { } gain) => [ValidationErrors.EduImprovementGainNotAllowed(index, gain)],
            _ => [],
        };
    }

    private static IEnumerable<ValidationError> DiceProblems(string field, DiceExpression dice, int? result) =>
        result is { } value && !dice.CanProduce(value)
            ? [ValidationErrors.DiceResultOutOfRange(field, dice, value)]
            : [];

    private static string FloorField(Characteristic characteristic, CharacterSheet sheet, AgeBracket bracket) =>
        bracket.AllowsDeductionFrom(characteristic) && sheet.AgeDeductions[characteristic] is not null
            ? ValidationErrors.AgeDeductionField(characteristic)
            : ValidationErrors.CharacteristicField(characteristic);
}
