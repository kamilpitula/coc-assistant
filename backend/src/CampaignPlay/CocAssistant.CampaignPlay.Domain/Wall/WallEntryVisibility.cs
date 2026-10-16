namespace CocAssistant.CampaignPlay.Domain.Wall;

/// <summary>Who may read a Wall Entry; Keeper-only entries are never visible to Players.</summary>
public enum WallEntryVisibility
{
    Public,
    KeeperOnly,
}
