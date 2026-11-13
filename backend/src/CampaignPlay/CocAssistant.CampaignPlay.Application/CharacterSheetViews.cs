namespace CocAssistant.CampaignPlay.Application;

/// <summary>Builds Character Sheet views with the display name of the Player and of every roller on the sheet.</summary>
public static class CharacterSheetViews
{
    public static async Task<CharacterSheetView> ViewAsync(
        CharacterSheetEvaluator evaluator,
        IAccountDisplayNames displayNames,
        Investigator investigator,
        Campaign campaign,
        bool includeReplacedRollRecords,
        CancellationToken cancellationToken)
    {
        var records = includeReplacedRollRecords
            ? investigator.CharacterSheet.RollRecords.Concat(investigator.CharacterSheet.ReplacedRollRecords)
            : investigator.CharacterSheet.RollRecords;
        var rollerIds = records
            .Select(record => record.RolledByAccountId)
            .OfType<Guid>()
            .Distinct()
            .ToList();
        var names = await displayNames.GetDisplayNamesAsync([.. rollerIds, investigator.PlayerAccountId], cancellationToken);
        return evaluator.View(
            investigator,
            campaign,
            names.GetValueOrDefault(investigator.PlayerAccountId),
            rollerIds.Where(names.ContainsKey).ToDictionary(accountId => accountId, accountId => names[accountId]),
            includeReplacedRollRecords);
    }
}
