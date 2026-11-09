namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>
/// Which creation inputs the Roll Records already on the sheet lock (specs/character-sheet/spec.md, Creation locks).
/// Locks apply to Server and PlayerEntered records alike.
/// </summary>
public sealed record CreationLocks(bool CreationMethod, bool AgeBracket, bool Edu)
{
    /// <summary>
    /// The locks the stored sheet's records impose. The age-bracket lock applies only while the stored age has a
    /// bracket; otherwise the first valid age fixes it.
    /// </summary>
    public static CreationLocks Of(CharacterSheet sheet, AgeBracket? bracket) =>
        new(
            sheet.RollRecords.Any(record => RollPurposes.IsCharacteristicPurpose(record.Purpose)),
            bracket is not null && sheet.RollRecords.Any(record => IsLuckOrEduPurpose(record.Purpose)),
            sheet.RollRecords.Any(record => IsEduPurpose(record.Purpose)));

    /// <summary>Whether replacing the stored sheet with the next one would break a lock.</summary>
    public static bool Refuses(CharacterSheet stored, CharacterSheet next, AgeRules ageRules)
    {
        var storedBracket = BracketOf(stored, ageRules);
        var storedLocks = Of(stored, storedBracket);

        if (next.CreationMethod != stored.CreationMethod && storedLocks.CreationMethod)
        {
            return true;
        }

        if (storedLocks.AgeBracket && BracketOf(next, ageRules) != storedBracket)
        {
            return true;
        }

        return storedLocks.Edu
            && CharacterSheetCalculator.AssignedValuesOf(next)[Characteristic.Education]
                != CharacterSheetCalculator.AssignedValuesOf(stored)[Characteristic.Education];
    }

    private static AgeBracket? BracketOf(CharacterSheet sheet, AgeRules ageRules) =>
        sheet.Identity.Age is { } age ? ageRules.BracketFor(age) : null;

    private static bool IsLuckOrEduPurpose(string purpose) =>
        purpose is RollPurposes.Luck or RollPurposes.LuckSecondRoll || IsEduPurpose(purpose);

    private static bool IsEduPurpose(string purpose) => RollPurposes.EduImprovementCheckNumberOf(purpose) is not null;
}
