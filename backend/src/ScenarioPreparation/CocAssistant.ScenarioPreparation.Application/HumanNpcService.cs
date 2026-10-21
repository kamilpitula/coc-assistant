namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Creates, reads, edits, and deletes a Campaign's Human NPCs for its Keeper (specs/scenario-preparation/spec.md). The
/// Keeper check runs first on every operation, so a Player, another Campaign's Keeper, a missing Campaign, or a Human NPC
/// of another Campaign all end as NotFound before any profile is read or written (ADR 0013).
/// </summary>
public class HumanNpcService
{
    private readonly ICampaignKeepers _keepers;
    private readonly IHumanNpcRepository _humanNpcs;
    private readonly INonPlayerEntityRuleData _ruleData;
    private readonly TimeProvider _timeProvider;

    public HumanNpcService(ICampaignKeepers keepers, IHumanNpcRepository humanNpcs, INonPlayerEntityRuleData ruleData, TimeProvider timeProvider)
    {
        _keepers = keepers;
        _humanNpcs = humanNpcs;
        _ruleData = ruleData;
        _timeProvider = timeProvider;
    }

    /// <summary>One Human NPC; null when the caller is not the Keeper or it is not in this Campaign.</summary>
    public async Task<HumanNpcView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        var humanNpc = await FindAsync(campaignId, callerAccountId, humanNpcId, cancellationToken);
        return humanNpc is null ? null : ToView(humanNpc);
    }

    /// <summary>Creates a Human NPC with only its name and age; the Keeper adds the rest by editing.</summary>
    public async Task<HumanNpcWriteResult> CreateAsync(
        Guid campaignId,
        Guid callerAccountId,
        string? name,
        int? age,
        CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new HumanNpcWriteResult(HumanNpcWriteOutcome.NotFound, [], null);
        }

        var creation = HumanNpc.Create(campaignId, name, age, _timeProvider.GetUtcNow());
        if (creation.HumanNpc is null)
        {
            return new HumanNpcWriteResult(HumanNpcWriteOutcome.Invalid, creation.Problems, null);
        }

        _humanNpcs.Add(creation.HumanNpc);
        await _humanNpcs.SaveChangesAsync(cancellationToken);
        return new HumanNpcWriteResult(HumanNpcWriteOutcome.Saved, [], ToView(creation.HumanNpc));
    }

    /// <summary>Replaces the name and the whole NPC Profile; a refused edit changes nothing.</summary>
    public async Task<HumanNpcWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid humanNpcId,
        string? name,
        NpcProfile profile,
        CancellationToken cancellationToken)
    {
        var humanNpc = await FindAsync(campaignId, callerAccountId, humanNpcId, cancellationToken);
        if (humanNpc is null)
        {
            return new HumanNpcWriteResult(HumanNpcWriteOutcome.NotFound, [], null);
        }

        var problems = humanNpc.Edit(name, profile, _ruleData.CombatSkillSpecializations);
        if (problems.Count > 0)
        {
            return new HumanNpcWriteResult(HumanNpcWriteOutcome.Invalid, problems, null);
        }

        await _humanNpcs.SaveChangesAsync(cancellationToken);
        return new HumanNpcWriteResult(HumanNpcWriteOutcome.Saved, [], ToView(humanNpc));
    }

    /// <summary>
    /// Duplicates a HumanNpc within its Campaign for its Keeper; null when the caller is not the Keeper or it is not in this
    /// Campaign. A duplicate cannot be invalid, so the stored profile is copied as it is (spec.md, Constraints, Duplicate).
    /// </summary>
    public async Task<HumanNpcView?> DuplicateAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        var source = await FindAsync(campaignId, callerAccountId, humanNpcId, cancellationToken);
        if (source is null)
        {
            return null;
        }

        var copy = source.Duplicate(_timeProvider.GetUtcNow());
        _humanNpcs.Add(copy);
        await _humanNpcs.SaveChangesAsync(cancellationToken);
        return ToView(copy);
    }

    /// <summary>Deletes a Human NPC. Refusing when it is linked to a played Scene arrives with Scene links (PBI-SP-004).</summary>
    public async Task<HumanNpcDeleteOutcome> DeleteAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId, CancellationToken cancellationToken)
    {
        var humanNpc = await FindAsync(campaignId, callerAccountId, humanNpcId, cancellationToken);
        if (humanNpc is null)
        {
            return HumanNpcDeleteOutcome.NotFound;
        }

        _humanNpcs.Remove(humanNpc);
        await _humanNpcs.SaveChangesAsync(cancellationToken);
        return HumanNpcDeleteOutcome.Deleted;
    }

    private async Task<HumanNpc?> FindAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _humanNpcs.FindByIdAsync(campaignId, humanNpcId, cancellationToken)
            : null;

    private HumanNpcView ToView(HumanNpc humanNpc)
    {
        var profile = humanNpc.Profile;
        return new HumanNpcView(
            humanNpc.Id,
            humanNpc.Name,
            profile,
            NpcProfileCalculator.Derive(profile, _ruleData.CharacteristicsRules),
            profile.Characteristics?.Values
                .Where(entry => entry.Value is not null)
                .ToDictionary(entry => entry.Key, entry => NpcProfileCalculator.DifficultyOf(entry.Value!.Value))
                ?? [],
            (profile.Skills ?? []).Select(skill => NpcProfileCalculator.DifficultyOf(skill.Value ?? 0)).ToList(),
            profile.Combat?.Dodge is { } dodge ? NpcProfileCalculator.DifficultyOf(dodge) : null);
    }
}
