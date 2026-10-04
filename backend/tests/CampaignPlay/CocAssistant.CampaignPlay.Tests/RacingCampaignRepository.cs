namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Wraps a real repository and lets a competing request commit just before the first save,
/// so a lost concurrency race can be reproduced deterministically.
/// </summary>
public sealed class RacingCampaignRepository : ICampaignRepository
{
    private readonly ICampaignRepository _inner;
    private Func<Task>? _competingRequest;

    public RacingCampaignRepository(ICampaignRepository inner, Func<Task> competingRequest)
    {
        _inner = inner;
        _competingRequest = competingRequest;
    }

    public int SaveAttempts { get; private set; }

    public void Add(Campaign campaign) => _inner.Add(campaign);

    public Task<Campaign?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        _inner.FindByIdAsync(id, cancellationToken);

    public Task<Campaign?> FindByInviteTokenAsync(string token, CancellationToken cancellationToken) =>
        _inner.FindByInviteTokenAsync(token, cancellationToken);

    public Task<IReadOnlyList<Campaign>> ListForMemberAsync(Guid accountId, CancellationToken cancellationToken) =>
        _inner.ListForMemberAsync(accountId, cancellationToken);

    public void DiscardPendingChanges() => _inner.DiscardPendingChanges();

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        SaveAttempts++;
        var competingRequest = _competingRequest;
        _competingRequest = null;
        if (competingRequest is not null)
        {
            await competingRequest();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}
