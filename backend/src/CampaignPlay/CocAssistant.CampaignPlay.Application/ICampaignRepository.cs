namespace CocAssistant.CampaignPlay.Application;

/// <summary>Application port for Campaign persistence, implemented by Infrastructure.</summary>
public interface ICampaignRepository
{
    void Add(Campaign campaign);

    Task<Campaign?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
