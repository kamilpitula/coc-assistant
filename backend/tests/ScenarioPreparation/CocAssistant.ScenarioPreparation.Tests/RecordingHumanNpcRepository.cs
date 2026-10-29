namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingHumanNpcRepository : IHumanNpcRepository
{
    private readonly IHumanNpcRepository _inner;

    public RecordingHumanNpcRepository(IHumanNpcRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public void Add(HumanNpc humanNpc)
    {
        Calls.Add(nameof(Add));
        _inner.Add(humanNpc);
    }

    public void Remove(HumanNpc humanNpc)
    {
        Calls.Add(nameof(Remove));
        _inner.Remove(humanNpc);
    }

    public Task<HumanNpc?> FindByIdAsync(Guid campaignId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindByIdAsync));
        return _inner.FindByIdAsync(campaignId, humanNpcId, cancellationToken);
    }

    /// <summary>When set, runs just before the inner save, so a test can play a Scene start that wins the race.</summary>
    public Func<Task>? BeforeSave { get; set; }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        if (BeforeSave is not null)
        {
            await BeforeSave();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Delegates to a real repository and records each call, so tests can prove a refused caller reached no data.</summary>
public sealed class RecordingMythosCreatureRepository : IMythosCreatureRepository
{
    private readonly IMythosCreatureRepository _inner;

    public RecordingMythosCreatureRepository(IMythosCreatureRepository inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public void Add(MythosCreature mythosCreature)
    {
        Calls.Add(nameof(Add));
        _inner.Add(mythosCreature);
    }

    public void Remove(MythosCreature mythosCreature)
    {
        Calls.Add(nameof(Remove));
        _inner.Remove(mythosCreature);
    }

    public Task<MythosCreature?> FindByIdAsync(Guid campaignId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(FindByIdAsync));
        return _inner.FindByIdAsync(campaignId, mythosCreatureId, cancellationToken);
    }

    /// <summary>When set, runs just before the inner save, so a test can play a Scene start that wins the race.</summary>
    public Func<Task>? BeforeSave { get; set; }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        if (BeforeSave is not null)
        {
            await BeforeSave();
        }

        await _inner.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Records list calls, so tests can prove a refused caller read no entity.</summary>
public sealed class RecordingNonPlayerEntityDirectory : INonPlayerEntityDirectory
{
    private readonly INonPlayerEntityDirectory _inner;

    public RecordingNonPlayerEntityDirectory(INonPlayerEntityDirectory inner) => _inner = inner;

    public List<string> Calls { get; } = [];

    public Task<IReadOnlyList<NonPlayerEntitySummary>> ListForCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        Calls.Add(nameof(ListForCampaignAsync));
        return _inner.ListForCampaignAsync(campaignId, cancellationToken);
    }
}

/// <summary>The Damage Bonus table and combat specializations of <see cref="NpcProfileSamples"/>.</summary>
public sealed class FakeNonPlayerEntityRuleData : INonPlayerEntityRuleData
{
    public CharacteristicsRules CharacteristicsRules => NpcProfileSamples.Rules;

    public CombatSkillSpecializations CombatSkillSpecializations => NpcProfileSamples.Specializations;
}
