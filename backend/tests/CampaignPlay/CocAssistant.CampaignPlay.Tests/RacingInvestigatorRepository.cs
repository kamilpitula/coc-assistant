namespace CocAssistant.CampaignPlay.Tests;

/// <summary>
/// Wraps a real Investigator repository and lets a competing request commit just before the first save, so a lost
/// creation race can be reproduced deterministically.
/// </summary>
public sealed class RacingInvestigatorRepository : IInvestigatorRepository
{
    private readonly IInvestigatorRepository _inner;
    private Func<Task>? _competingRequest;

    public RacingInvestigatorRepository(IInvestigatorRepository inner, Func<Task> competingRequest)
    {
        _inner = inner;
        _competingRequest = competingRequest;
    }

    public void Add(Investigator investigator) => _inner.Add(investigator);

    public void Remove(Investigator investigator) => _inner.Remove(investigator);

    public Task<Investigator?> FindByIdAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken) =>
        _inner.FindByIdAsync(campaignId, investigatorId, cancellationToken);

    public Task<Investigator?> FindForPlayerAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken) =>
        _inner.FindForPlayerAsync(campaignId, playerAccountId, cancellationToken);

    public Task<IReadOnlyList<Investigator>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        _inner.ListForCampaignAsync(campaignId, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        var competingRequest = _competingRequest;
        _competingRequest = null;
        if (competingRequest is not null)
        {
            await competingRequest();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}
