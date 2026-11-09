namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Server-side EDU improvement checks (docs/game-rules/coc7_character_creation_and_development_rules.md sections 3.1
/// and 3.2): rolls the next check's D100 and, when the check improves EDU, its 1D10 gain in the same action. A check
/// whose gain is missing from a legacy PlayerEntered record is never filled in.
/// </summary>
public static class EduImprovementRolling
{
    public static IReadOnlyList<RollRecord> RollNext(
        CharacterSheet sheet,
        AgeBracket bracket,
        IDiceRoller roller,
        Guid rolledByAccountId,
        DateTimeOffset rolledAt)
    {
        var education = CharacterSheetCalculator.AssignedValuesOf(sheet)[Characteristic.Education];
        if (!IsUsableEdu(sheet, education))
        {
            return [];
        }

        var next = Enumerable.Range(1, bracket.EduImprovementChecks)
            .FirstOrDefault(number => sheet.ResultFor(RollPurposes.EduImprovementCheck(number)) is null, -1);
        if (next < 0)
        {
            return [];
        }

        var check = DiceRolling.Roll(CreationDice.EduImprovementCheck, roller);
        var inputs = Enumerable.Range(1, next)
            .Select(number => number == next
                ? new EduImprovementCheckInput(check.Total, null)
                : new EduImprovementCheckInput(
                    sheet.ResultFor(RollPurposes.EduImprovementCheck(number)),
                    sheet.ResultFor(RollPurposes.EduImprovementGain(number))))
            .ToList();
        var improves = EduImprovement.Evaluate(education!.Value, inputs)[^1].Improves;

        var records = new List<RollRecord> { RollRecord.FromServer(RollPurposes.EduImprovementCheck(next), check, rolledByAccountId, rolledAt) };
        if (improves)
        {
            records.Add(RollRecord.FromServer(
                RollPurposes.EduImprovementGain(next),
                DiceRolling.Roll(CreationDice.EduImprovementGain, roller),
                rolledByAccountId,
                rolledAt));
        }

        return records;
    }

    // A roll against an EDU its Creation Method cannot produce is refused, so a locked EDU is always valid
    // (specs/character-sheet/spec.md, Creation rolling).
    private static bool IsUsableEdu(CharacterSheet sheet, int? education) =>
        education is not null && sheet.CreationMethod switch
        {
            CreationMethod.PointBuy => education >= PointBuyRules.Minimum && education <= PointBuyRules.Maximum,
            CreationMethod.QuickFire => QuickFireRules.CharacteristicValues.Contains(education.Value),
            CreationMethod.StandardRolling => sheet.CharacteristicRolls[Characteristic.Education] is { } raw
                && StandardRolling.FormulaFor(Characteristic.Education).Dice.CanProduce(raw),
            _ => false,
        };
}
