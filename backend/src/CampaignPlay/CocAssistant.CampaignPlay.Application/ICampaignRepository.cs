namespace CocAssistant.CampaignPlay.Application;

/// <summary>Application port for Campaign persistence, implemented by Infrastructure.</summary>
public interface ICampaignRepository
{
    void Add(Campaign campaign);

    Task<Campaign?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Campaign?> FindByInviteTokenAsync(string token, CancellationToken cancellationToken);

    /// <summary>Drops pending tracked changes so the next read reflects fresh database state, used to retry a lost join race.</summary>
    void DiscardPendingChanges();

    /// <summary>Persists pending changes, throwing <see cref="CampaignMembershipConflictException"/> on a concurrency conflict.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
