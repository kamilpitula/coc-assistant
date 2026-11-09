namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Server-side Luck rolling (docs/game-rules/coc7_character_creation_and_development_rules.md sections 3.1 and 5.5):
/// rolls Luck and, when the age bracket rolls twice, the second Luck roll. Purposes that already have a Roll Record
/// (Server or PlayerEntered) are kept.
/// </summary>
public static class LuckRolling
{
    public static IReadOnlyList<RollRecord> RollMissing(
        CharacterSheet sheet,
        AgeBracket bracket,
        IDiceRoller roller,
        Guid rolledByAccountId,
        DateTimeOffset rolledAt)
    {
        var present = sheet.RollRecords.Select(record => record.Purpose).ToHashSet(StringComparer.Ordinal);
        IReadOnlyList<string> purposes = bracket.LuckRolls >= 2
            ? [RollPurposes.Luck, RollPurposes.LuckSecondRoll]
            : [RollPurposes.Luck];
        return purposes
            .Where(purpose => !present.Contains(purpose))
            .Select(purpose => RollRecord.FromServer(
                purpose,
                DiceRolling.Roll(CreationDice.Luck, roller),
                rolledByAccountId,
                rolledAt))
            .ToList();
    }
}
