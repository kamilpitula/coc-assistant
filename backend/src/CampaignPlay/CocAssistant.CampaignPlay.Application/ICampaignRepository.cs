namespace CocAssistant.CampaignPlay.Application;

/// <summary>Application port for Campaign persistence, implemented by Infrastructure.</summary>
public interface ICampaignRepository
{
    void Add(Campaign campaign);

    Task<Campaign?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Campaign?> FindByInviteTokenAsync(string token, CancellationToken cancellationToken);

    /// <summary>Drops pending tracked changes so the next read reflects fresh database state, used to retry a lost join race.</summary>
    void DiscardPendingChanges();

    /// <summary>
    /// Persists pending changes, throwing <see cref="CampaignMembershipConflictException"/> when a concurrent
    /// join or a concurrent active Invite won the race.
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
