namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Application port for Mythos Creature persistence, implemented by Infrastructure. Lookups filter Campaign and Mythos
/// Creature ids together, so a Mythos Creature of another Campaign is simply not found (ADR 0013).
/// </summary>
public interface IMythosCreatureRepository
{
    void Add(MythosCreature mythosCreature);

    void Remove(MythosCreature mythosCreature);

    Task<MythosCreature?> FindByIdAsync(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
