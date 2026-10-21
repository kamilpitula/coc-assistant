namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>
/// Creates, reads, edits, and deletes a Campaign's Mythos Creatures for its Keeper (specs/scenario-preparation/spec.md).
/// The Keeper check runs first on every operation, so a Player, another Campaign's Keeper, a missing Campaign, or a
/// Mythos Creature of another Campaign all end as NotFound before any profile is read or written (ADR 0013).
/// </summary>
public class MythosCreatureService
{
    private readonly ICampaignKeepers _keepers;
    private readonly IMythosCreatureRepository _mythosCreatures;
    private readonly INonPlayerEntityRuleData _ruleData;
    private readonly TimeProvider _timeProvider;

    public MythosCreatureService(
        ICampaignKeepers keepers,
        IMythosCreatureRepository mythosCreatures,
        INonPlayerEntityRuleData ruleData,
        TimeProvider timeProvider)
    {
        _keepers = keepers;
        _mythosCreatures = mythosCreatures;
        _ruleData = ruleData;
        _timeProvider = timeProvider;
    }

    /// <summary>One Mythos Creature; null when the caller is not the Keeper or it is not in this Campaign.</summary>
    public async Task<MythosCreatureView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var mythosCreature = await FindAsync(campaignId, callerAccountId, mythosCreatureId, cancellationToken);
        return mythosCreature is null ? null : ToView(mythosCreature);
    }

    /// <summary>Creates a Mythos Creature with only its name; the Keeper adds the rest by editing.</summary>
    public async Task<MythosCreatureWriteResult> CreateAsync(Guid campaignId, Guid callerAccountId, string? name, CancellationToken cancellationToken)
    {
        if (!await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken))
        {
            return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.NotFound, [], null);
        }

        var creation = MythosCreature.Create(campaignId, name, _timeProvider.GetUtcNow());
        if (creation.MythosCreature is null)
        {
            return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.Invalid, creation.Problems, null);
        }

        _mythosCreatures.Add(creation.MythosCreature);
        await _mythosCreatures.SaveChangesAsync(cancellationToken);
        return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.Saved, [], ToView(creation.MythosCreature));
    }

    /// <summary>Replaces the name and the whole Monster Profile; a refused edit changes nothing.</summary>
    public async Task<MythosCreatureWriteResult> EditAsync(
        Guid campaignId,
        Guid callerAccountId,
        Guid mythosCreatureId,
        string? name,
        MonsterProfile profile,
        CancellationToken cancellationToken)
    {
        var mythosCreature = await FindAsync(campaignId, callerAccountId, mythosCreatureId, cancellationToken);
        if (mythosCreature is null)
        {
            return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.NotFound, [], null);
        }

        var problems = mythosCreature.Edit(name, profile);
        if (problems.Count > 0)
        {
            return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.Invalid, problems, null);
        }

        await _mythosCreatures.SaveChangesAsync(cancellationToken);
        return new MythosCreatureWriteResult(MythosCreatureWriteOutcome.Saved, [], ToView(mythosCreature));
    }

    /// <summary>
    /// Duplicates a MythosCreature within its Campaign for its Keeper; null when the caller is not the Keeper or it is not in this
    /// Campaign. A duplicate cannot be invalid, so the stored profile is copied as it is (spec.md, Constraints, Duplicate).
    /// </summary>
    public async Task<MythosCreatureView?> DuplicateAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var source = await FindAsync(campaignId, callerAccountId, mythosCreatureId, cancellationToken);
        if (source is null)
        {
            return null;
        }

        var copy = source.Duplicate(_timeProvider.GetUtcNow());
        _mythosCreatures.Add(copy);
        await _mythosCreatures.SaveChangesAsync(cancellationToken);
        return ToView(copy);
    }

    /// <summary>Deletes a Mythos Creature. Refusing when it is linked to a played Scene arrives with Scene links (PBI-SP-004).</summary>
    public async Task<MythosCreatureDeleteOutcome> DeleteAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId, CancellationToken cancellationToken)
    {
        var mythosCreature = await FindAsync(campaignId, callerAccountId, mythosCreatureId, cancellationToken);
        if (mythosCreature is null)
        {
            return MythosCreatureDeleteOutcome.NotFound;
        }

        _mythosCreatures.Remove(mythosCreature);
        await _mythosCreatures.SaveChangesAsync(cancellationToken);
        return MythosCreatureDeleteOutcome.Deleted;
    }

    private async Task<MythosCreature?> FindAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId, CancellationToken cancellationToken) =>
        await _keepers.IsKeeperAsync(campaignId, callerAccountId, cancellationToken)
            ? await _mythosCreatures.FindByIdAsync(campaignId, mythosCreatureId, cancellationToken)
            : null;

    private MythosCreatureView ToView(MythosCreature mythosCreature)
    {
        var profile = mythosCreature.Profile;
        return new MythosCreatureView(
            mythosCreature.Id,
            mythosCreature.Name,
            profile,
            MonsterProfileCalculator.Derive(profile, _ruleData.CharacteristicsRules),
            profile.Characteristics?.Values
                .Where(entry => entry.Value is not null)
                .ToDictionary(entry => entry.Key, entry => MonsterProfileCalculator.DifficultyOf(entry.Value!.Value))
                ?? [],
            (profile.Skills ?? []).Select(skill => MonsterProfileCalculator.DifficultyOf(skill.Value ?? 0)).ToList(),
            (profile.Combat?.Attacks ?? []).Select(attack => MonsterProfileCalculator.DifficultyOf(attack.SkillValue ?? 0)).ToList(),
            profile.Combat?.Dodge is { } dodge ? MonsterProfileCalculator.DifficultyOf(dodge) : null);
    }
}
