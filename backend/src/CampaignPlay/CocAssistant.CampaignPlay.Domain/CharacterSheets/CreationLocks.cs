namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Which creation inputs are locked by the Roll Records already on the sheet.</summary>
public sealed record CreationLocks(bool CreationMethod)
{
    /// <summary>The Creation Method is locked once any characteristic has a Roll Record.</summary>
    public static CreationLocks Of(CharacterSheet sheet) =>
        new(sheet.RollRecords.Any(record => CharacteristicPurposes.Contains(record.Purpose)));

    private static readonly HashSet<string> CharacteristicPurposes =
        CharacteristicCodes.All.Select(RollPurposes.Characteristic).ToHashSet(StringComparer.Ordinal);
}
