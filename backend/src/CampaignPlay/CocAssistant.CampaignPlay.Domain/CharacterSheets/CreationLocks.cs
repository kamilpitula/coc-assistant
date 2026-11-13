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
            sheet.RollRecords.Any(record => RollPurposes.GroupOf(record.Purpose) == RollGroup.Characteristics),
            bracket is not null && sheet.RollRecords.Any(record => RollPurposes.GroupOf(record.Purpose) is RollGroup.Luck or RollGroup.EduImprovementChecks),
            sheet.RollRecords.Any(record => RollPurposes.GroupOf(record.Purpose) == RollGroup.EduImprovementChecks));

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
}
