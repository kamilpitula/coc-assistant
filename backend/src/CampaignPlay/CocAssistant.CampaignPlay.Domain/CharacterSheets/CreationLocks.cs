namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>Which creation inputs are locked by the Roll Records already on the sheet.</summary>
public sealed record CreationLocks(bool CreationMethod)
{
    /// <summary>The Creation Method is locked once any characteristic has a Roll Record.</summary>
    public static CreationLocks Of(CharacterSheet sheet) =>
        new(sheet.RollRecords.Any(record => RollPurposes.IsCharacteristicPurpose(record.Purpose)));
}
