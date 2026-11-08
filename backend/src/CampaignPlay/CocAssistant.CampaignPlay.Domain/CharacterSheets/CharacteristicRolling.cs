namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Server-side Standard Rolling (docs/game-rules/coc7_character_creation_and_development_rules.md section 2.1):
/// rolls every characteristic that has no Roll Record yet, in CharacteristicCodes.All order.
/// </summary>
public static class CharacteristicRolling
{
    public static IReadOnlyList<RollRecord> RollMissing(
        CharacterSheet sheet,
        IDiceRoller roller,
        Guid rolledByAccountId,
        DateTimeOffset rolledAt)
    {
        var present = sheet.RollRecords.Select(record => record.Purpose).ToHashSet(StringComparer.Ordinal);
        return CharacteristicCodes.All
            .Where(characteristic => !present.Contains(RollPurposes.Characteristic(characteristic)))
            .Select(characteristic => RollRecord.FromServer(
                RollPurposes.Characteristic(characteristic),
                DiceRolling.Roll(StandardRolling.FormulaFor(characteristic).Dice, roller),
                rolledByAccountId,
                rolledAt))
            .ToList();
    }
}
