namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>
/// A chronological record in one Campaign, either Public or Keeper-only (specs/campaign-play/spec.md, Play Record).
/// The Keeper authors both kinds, a Player only Public ones, and only the Keeper removes entries. Entries are never edited.
/// </summary>
public class WallEntry : AggregateRoot
{
    /// <summary>The longest Wall Entry text (specs/campaign-wall/ux.md section 2).</summary>
    public const int TextMaxLength = 2000;

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public Guid AuthorAccountId { get; private set; }
    public WallEntryVisibility Visibility { get; private set; }
    public string Text { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private WallEntry()
    {
        Text = string.Empty;
    }

    private WallEntry(Guid campaignId, Guid authorAccountId, WallEntryVisibility visibility, string text, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        AuthorAccountId = authorAccountId;
        Visibility = visibility;
        Text = text;
        CreatedAt = createdAt;
    }

    /// <summary>Authors an entry for a Campaign Member, refusing what the member's role does not allow.</summary>
    public static WallEntryAuthoring Author(
        Campaign campaign,
        Guid authorAccountId,
        string text,
        WallEntryVisibility visibility,
        DateTimeOffset now)
    {
        if (!campaign.IsMember(authorAccountId))
        {
            return Refused(WallEntryAuthoringOutcome.NotAMember);
        }

        if (!campaign.IsKeeper(authorAccountId) && visibility != WallEntryVisibility.Public)
        {
            return Refused(WallEntryAuthoringOutcome.PlayersCanOnlyAuthorPublic);
        }

        var trimmed = text.Trim();
        if (trimmed.Length is 0 or > TextMaxLength)
        {
            return Refused(WallEntryAuthoringOutcome.InvalidText);
        }

        var entry = new WallEntry(campaign.Id, authorAccountId, visibility, trimmed, now);
        entry.Raise(new WallEntryAdded(entry.CampaignId, entry.Id, entry.Visibility));
        return new WallEntryAuthoring(WallEntryAuthoringOutcome.Created, entry);
    }

    /// <summary>The Keeper reads every entry; a Player reads Public ones only; a non-member reads none.</summary>
    public bool CanBeReadBy(Campaign campaign, Guid accountId) =>
        campaign.IsKeeper(accountId) || (campaign.IsPlayer(accountId) && Visibility == WallEntryVisibility.Public);

    /// <summary>Only the Keeper removes entries, including a Player's.</summary>
    public bool CanBeRemovedBy(Campaign campaign, Guid accountId) => campaign.IsKeeper(accountId);

    /// <summary>
    /// Records the removal when the account may remove the entry; the caller then deletes the entry.
    /// Returns false and raises nothing otherwise.
    /// </summary>
    public bool Remove(Campaign campaign, Guid accountId)
    {
        if (!CanBeRemovedBy(campaign, accountId))
        {
            return false;
        }

        Raise(new WallEntryRemoved(CampaignId, Id, Visibility));
        return true;
    }

    private static WallEntryAuthoring Refused(WallEntryAuthoringOutcome outcome) => new(outcome, null);
}
