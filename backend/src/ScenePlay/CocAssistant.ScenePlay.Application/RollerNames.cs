namespace CocAssistant.ScenePlay.Application;

/// <summary>
/// Resolves the display names of everyone who rolled a Requested Roll, for the views. No Account id ever reaches a view
/// (specs/roll-requests/spec.md, Visibility of results). One lookup for all of a read's rolls.
/// </summary>
internal static class RollerNames
{
    public static async Task<IReadOnlyDictionary<Guid, string>> ResolveAsync(
        IAccountNames names,
        IEnumerable<RequestedRollRecord> rolls,
        CancellationToken cancellationToken)
    {
        var ids = rolls
            .SelectMany(roll => roll.RollRecords)
            .Select(record => record.RolledByAccountId)
            .OfType<Guid>()
            .Distinct()
            .ToList();
        return ids.Count == 0
            ? new Dictionary<Guid, string>()
            : await names.GetDisplayNamesAsync(ids, cancellationToken);
    }
}
