namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Reads, adds, and removes a Campaign's Wall Entries for one of its members (specs/campaign-play/spec.md, Wall Entry API).
/// Visibility is applied in the query, before ordering and paging, so a Player's result is built only from Public entries.
/// </summary>
public class WallEntryService
{
    private readonly ICampaignRepository _campaigns;
    private readonly IWallEntryRepository _wallEntries;
    private readonly IAccountDisplayNames _displayNames;
    private readonly TimeProvider _timeProvider;

    public WallEntryService(
        ICampaignRepository campaigns,
        IWallEntryRepository wallEntries,
        IAccountDisplayNames displayNames,
        TimeProvider timeProvider)
    {
        _campaigns = campaigns;
        _wallEntries = wallEntries;
        _displayNames = displayNames;
        _timeProvider = timeProvider;
    }

    /// <summary>The newest entries the caller may read; null when the Campaign is missing or the caller is not a member.</summary>
    public async Task<WallEntryPage?> ListAsync(
        Guid campaignId,
        Guid callerAccountId,
        int limit,
        WallEntryCursor? after,
        CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsMember(callerAccountId))
        {
            return null;
        }

        // One extra visible entry tells whether another page exists without counting what the caller may not see.
        var entries = await _wallEntries.ListAsync(campaignId, campaign.IsKeeper(callerAccountId), after, limit + 1, cancellationToken);
        var page = entries.Take(limit).ToList();
        var views = await ProjectAsync(page, cancellationToken);
        var nextCursor = entries.Count > limit ? new WallEntryCursor(page[^1].CreatedAt, page[^1].Id).ToToken() : null;
        return new WallEntryPage(views, nextCursor);
    }

    /// <summary>Adds an entry as the caller; a missing Campaign counts as the caller not being a member.</summary>
    public async Task<AddWallEntryResult> AddAsync(
        Guid campaignId,
        Guid callerAccountId,
        string text,
        WallEntryVisibility visibility,
        CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null)
        {
            return new AddWallEntryResult(WallEntryAuthoringOutcome.NotAMember, null);
        }

        var authoring = WallEntry.Author(campaign, callerAccountId, text, visibility, _timeProvider.GetUtcNow());
        if (authoring.Entry is null)
        {
            return new AddWallEntryResult(authoring.Outcome, null);
        }

        _wallEntries.Add(authoring.Entry);
        await _wallEntries.SaveChangesAsync(cancellationToken);
        var view = (await ProjectAsync([authoring.Entry], cancellationToken))[0];
        return new AddWallEntryResult(WallEntryAuthoringOutcome.Created, view);
    }

    /// <summary>
    /// Removes an entry as the Keeper. A Player, a non-member, or a missing or foreign entry all get the same
    /// <see cref="RemoveWallEntryOutcome.NotFound"/>, decided before any entry is looked up for non-Keepers.
    /// </summary>
    public async Task<RemoveWallEntryOutcome> RemoveAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid entryId,
        CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.FindByIdAsync(campaignId, cancellationToken);
        if (campaign is null || !campaign.IsKeeper(callerAccountId))
        {
            return RemoveWallEntryOutcome.NotFound;
        }

        var entry = await _wallEntries.FindByIdAsync(campaignId, entryId, cancellationToken);
        if (entry is null || !entry.Remove(campaign, callerAccountId))
        {
            return RemoveWallEntryOutcome.NotFound;
        }

        _wallEntries.Remove(entry);
        await _wallEntries.SaveChangesAsync(cancellationToken);
        return RemoveWallEntryOutcome.Removed;
    }

    private async Task<IReadOnlyList<WallEntryView>> ProjectAsync(
        IReadOnlyList<WallEntry> entries,
        CancellationToken cancellationToken)
    {
        var authorIds = entries.Select(entry => entry.AuthorAccountId).Distinct().ToList();
        var names = await _displayNames.GetDisplayNamesAsync(authorIds, cancellationToken);
        return entries
            .Select(entry => new WallEntryView(
                entry.Id,
                entry.Text,
                entry.Visibility,
                entry.CreatedAt,
                names.GetValueOrDefault(entry.AuthorAccountId) ?? string.Empty))
            .ToList();
    }
}
