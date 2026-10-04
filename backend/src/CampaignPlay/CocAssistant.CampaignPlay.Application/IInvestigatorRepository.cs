namespace CocAssistant.CampaignPlay.Application;

/// <summary>Application port for Investigator persistence; every lookup is scoped to the given Campaigns.</summary>
public interface IInvestigatorRepository
{
    void Add(Investigator investigator);

    void Remove(Investigator investigator);

    Task<Investigator?> FindByIdAsync(Guid campaignId, Guid investigatorId, CancellationToken cancellationToken);

    Task<Investigator?> FindForPlayerAsync(Guid campaignId, Guid playerAccountId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Investigator>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Investigator>> ListForCampaignsAsync(IReadOnlyCollection<Guid> campaignIds, CancellationToken cancellationToken);

    /// <summary>
    /// Persists pending changes, throwing <see cref="InvestigatorConflictException"/> when the Player already has an
    /// Investigator in the Campaign or a concurrent change won the race.
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
