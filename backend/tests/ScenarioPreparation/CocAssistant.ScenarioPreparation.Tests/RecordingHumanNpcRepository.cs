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

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        Calls.Add(nameof(SaveChangesAsync));
        return _inner.SaveChangesAsync(cancellationToken);
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
