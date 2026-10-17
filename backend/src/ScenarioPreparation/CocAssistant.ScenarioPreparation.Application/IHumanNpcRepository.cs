namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for Human NPC persistence, implemented by Infrastructure. Lookups filter Campaign and Human NPC ids
/// together, so a Human NPC of another Campaign is simply not found (ADR 0013).
/// </summary>
public interface IHumanNpcRepository
{
    void Add(HumanNpc humanNpc);

    void Remove(HumanNpc humanNpc);

    Task<HumanNpc?> FindByIdAsync(Guid campaignId, Guid humanNpcId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
