namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Mythos Creature use cases for the Keeper, and the Keeper-only rule: every other caller ends in NotFound before any
/// profile is read or written (specs/scenario-preparation/spec.md; ADR 0013).
/// </summary>
public class MythosCreatureServiceTests : IDisposable
{
    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<MythosCreatureWriteResult> EditAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId, string name, MonsterProfile profile, IMythosCreatureRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateMythosCreatureService(context, repository).EditAsync(campaignId, callerAccountId, mythosCreatureId, name, profile, CancellationToken.None);
    }

    private async Task<MythosCreatureView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid mythosCreatureId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateMythosCreatureService(context).GetAsync(campaignId, callerAccountId, mythosCreatureId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_the_Keeper_When_creating_a_Mythos_Creature_Then_it_is_stored_with_its_name_and_an_empty_profile()
    {
        var view = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");

        var stored = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, view.Id);
        Assert.Equal("Ghoul", stored!.Name);
        Assert.Equal(MonsterProfile.Empty, stored.Profile);
        Assert.Equal(new CharacteristicDerivedValues(null, null, null, null), stored.Derived);
    }

    [Fact]
    public async Task Given_a_missing_name_When_creating_Then_it_is_invalid_and_nothing_is_stored()
    {
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateMythosCreatureService(context).CreateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, null, CancellationToken.None);

        Assert.Equal(MythosCreatureWriteOutcome.Invalid, result.Outcome);
        Assert.Equal([new MonsterProfileProblem("name", MonsterProfileProblemKind.NameRequired)], result.Problems);
        Assert.Equal(0, await _builder.StoredMythosCreatureCountAsync());
    }

    [Fact]
    public async Task Given_a_saved_edit_When_reading_Then_the_view_carries_derived_values_difficulty_and_the_overrides_beside_them()
    {
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        var profile = MonsterProfileSamples.Ghoul() with
        {
            Characteristics = MonsterProfileSamples.Characteristics(("STR", 80), ("CON", 60), ("SIZ", 60), ("POW", 95)) with
            {
                Overrides = MonsterOverrides.None with { HitPoints = new NumberOverride(40, "Swollen with stolen life") },
            },
            Skills = [new MonsterSkill("Stealth", 70), new MonsterSkill("Listen", 20)],
            Combat = new MonsterCombat(3, 90, [MonsterProfileSamples.Attack(skillValue: 40), MonsterProfileSamples.Attack(name: "Bite", skillValue: 55)]),
        };

        var result = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, "Ghoul", profile);

        Assert.Equal(MythosCreatureWriteOutcome.Saved, result.Outcome);
        var view = (await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id))!;
        Assert.Equal(new CharacteristicDerivedValues(12, 19, "+1D4", 1), view.Derived);
        Assert.Equal(40, view.Profile.Characteristics!.Overrides.HitPoints!.Value);
        Assert.Equal([InvestigatorDifficulty.Hard, InvestigatorDifficulty.Regular], view.SkillDifficulties);
        Assert.Equal([InvestigatorDifficulty.Regular, InvestigatorDifficulty.Hard], view.AttackDifficulties);
        Assert.Equal(InvestigatorDifficulty.Extreme, view.DodgeDifficulty);
        Assert.Equal(InvestigatorDifficulty.Extreme, view.CharacteristicDifficulties["POW"]);
        Assert.False(view.CharacteristicDifficulties.ContainsKey("APP"));
    }

    [Fact]
    public async Task Given_a_refused_edit_When_reading_Then_the_profile_is_unchanged()
    {
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        var profile = MonsterProfile.Empty with { SanityLoss = new MonsterSanityLoss("1D6") };

        var result = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, "Renamed", profile);

        Assert.Equal(MythosCreatureWriteOutcome.Invalid, result.Outcome);
        Assert.Equal([new MonsterProfileProblem("sanityLoss.value", MonsterProfileProblemKind.SanityLossMalformed)], result.Problems);
        var view = (await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id))!;
        Assert.Equal(("Ghoul", null), (view.Name, view.Profile.SanityLoss));
    }

    [Fact]
    public async Task Given_the_Keeper_When_deleting_Then_the_Mythos_Creature_is_gone()
    {
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        using (var context = _builder.Fixture.CreateContext())
        {
            var outcome = await _builder.CreateMythosCreatureService(context).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, CancellationToken.None);
            Assert.Equal(MythosCreatureDeleteOutcome.Deleted, outcome);
        }

        Assert.Null(await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id));
    }

    public static TheoryData<string> RefusedCallers() => new() { "Player", "OtherKeeper", "Stranger" };

    private (Guid CampaignId, Guid AccountId) Caller(string caller) => caller switch
    {
        "Player" => (_builder.CampaignId, ScenarioPreparationTestBuilder.PlayerAccountId),
        "OtherKeeper" => (_builder.CampaignId, ScenarioPreparationTestBuilder.OtherKeeperAccountId),
        _ => (Guid.NewGuid(), ScenarioPreparationTestBuilder.KeeperAccountId),
    };

    [Theory]
    [MemberData(nameof(RefusedCallers))]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_using_any_operation_Then_the_result_is_NotFound_and_no_data_is_touched(string caller)
    {
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        var (campaignId, accountId) = Caller(caller);
        var recording = new RecordingMythosCreatureRepository(null!);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateMythosCreatureService(context, recording);

        var get = await service.GetAsync(campaignId, accountId, created.Id, CancellationToken.None);
        var create = await service.CreateAsync(campaignId, accountId, "Intruder", CancellationToken.None);
        var edit = await service.EditAsync(campaignId, accountId, created.Id, "Hacked", MonsterProfile.Empty, CancellationToken.None);
        var delete = await service.DeleteAsync(campaignId, accountId, created.Id, CancellationToken.None);

        Assert.Null(get);
        Assert.Equal(MythosCreatureWriteOutcome.NotFound, create.Outcome);
        Assert.Equal(MythosCreatureWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(MythosCreatureDeleteOutcome.NotFound, delete);
        Assert.Empty(recording.Calls);
        Assert.Equal(1, await _builder.StoredMythosCreatureCountAsync());
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_of_another_Campaign_When_the_Keeper_uses_its_id_Then_it_is_NotFound_and_unchanged()
    {
        var other = await _builder.CreateMythosCreatureAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");

        var read = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id);
        var edit = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id, "Hijacked", MonsterProfile.Empty);
        using var context = _builder.Fixture.CreateContext();
        var delete = await _builder.CreateMythosCreatureService(context).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id, CancellationToken.None);

        Assert.Null(read);
        Assert.Equal(MythosCreatureWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(MythosCreatureDeleteOutcome.NotFound, delete);
        var untouched = await GetAsync(_builder.OtherCampaignOfSameKeeperId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id);
        Assert.Equal("Elsewhere", untouched!.Name);
    }

    [Fact]
    public async Task Given_a_Human_NPC_id_When_the_Keeper_uses_it_as_a_Mythos_Creature_Then_it_is_NotFound_and_the_Human_NPC_is_unchanged()
    {
        var human = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott", 62);

        var read = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, human.Id);
        var edit = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, human.Id, "Hijacked", MonsterProfile.Empty);
        using var context = _builder.Fixture.CreateContext();
        var delete = await _builder.CreateMythosCreatureService(context).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, human.Id, CancellationToken.None);

        Assert.Null(read);
        Assert.Equal(MythosCreatureWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(MythosCreatureDeleteOutcome.NotFound, delete);
        Assert.Equal(1, await _builder.StoredHumanNpcCountAsync());
    }

    private async Task<MythosCreatureView?> DuplicateAsync(Guid campaignId, Guid callerAccountId, Guid id, IMythosCreatureRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateMythosCreatureService(context, repository).DuplicateAsync(campaignId, callerAccountId, id, CancellationToken.None);
    }

    [Fact]
    public async Task Given_the_Keeper_When_duplicating_a_MythosCreature_Then_the_copy_is_stored_with_a_copy_name_and_the_source_is_unchanged()
    {
        var source = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");

        var copy = await DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, source.Id);

        Assert.NotNull(copy);
        Assert.NotEqual(source.Id, copy.Id);
        Assert.Equal("Ghoul (copy)", copy.Name);
        Assert.Equal(2, await _builder.StoredMythosCreatureCountAsync());
        var stored = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, copy.Id);
        Assert.Equal("Ghoul (copy)", stored!.Name);
        var original = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, source.Id);
        Assert.Equal("Ghoul", original!.Name);
    }

    [Fact]
    public async Task Given_the_Keeper_When_duplicating_Then_the_copy_is_added_and_saved_once()
    {
        var source = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingMythosCreatureRepository(new EfMythosCreatureRepository(context));

        var copy = await _builder.CreateMythosCreatureService(context, recording).DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, source.Id, CancellationToken.None);

        Assert.NotNull(copy);
        Assert.Equal([nameof(IMythosCreatureRepository.FindByIdAsync), nameof(IMythosCreatureRepository.Add), nameof(IMythosCreatureRepository.SaveChangesAsync)], recording.Calls);
    }

    [Theory]
    [MemberData(nameof(RefusedCallers))]
    public async Task Given_a_caller_who_is_not_the_Keeper_When_duplicating_Then_the_result_is_null_and_nothing_is_added_or_saved(string caller)
    {
        var source = await _builder.CreateMythosCreatureAsync(_builder.CampaignId, "Ghoul");
        var (campaignId, accountId) = Caller(caller);
        using var context = _builder.Fixture.CreateContext();
        var recording = new RecordingMythosCreatureRepository(new EfMythosCreatureRepository(context));

        var copy = await _builder.CreateMythosCreatureService(context, recording).DuplicateAsync(campaignId, accountId, source.Id, CancellationToken.None);

        Assert.Null(copy);
        Assert.Empty(recording.Calls);
        Assert.Equal(1, await _builder.StoredMythosCreatureCountAsync());
    }

    [Fact]
    public async Task Given_a_MythosCreature_of_another_Campaign_a_missing_id_or_the_other_type_When_the_Keeper_duplicates_Then_each_is_null_and_nothing_is_added()
    {
        var elsewhere = await _builder.CreateMythosCreatureAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");
        var otherType = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott", 62);

        var otherCampaign = await DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, elsewhere.Id);
        var missing = await DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, Guid.NewGuid());
        var wrongType = await DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, otherType.Id);

        Assert.Null(otherCampaign);
        Assert.Null(missing);
        Assert.Null(wrongType);
        Assert.Equal(1, await _builder.StoredMythosCreatureCountAsync());
        Assert.Equal(1, await _builder.StoredHumanNpcCountAsync());
    }

    private async Task<(Guid ScenarioId, Guid SceneId)> SceneAsync()
    {
        var scenario = await _builder.CreateScenarioAsync(_builder.CampaignId, "The Haunting");
        return (scenario.Id, (await _builder.CreateSceneAsync(_builder.CampaignId, scenario.Id, "The Corbitt House")).Id);
    }

    private async Task<MythosCreatureDeleteOutcome> DeleteAsync(Guid id, INonPlayerEntityUsage? usage = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateMythosCreatureService(context, null, usage).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, id, CancellationToken.None);
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public async Task Given_a_Mythos_Creature_linked_to_a_played_scene_When_deleting_Then_it_is_refused_and_nothing_is_removed(SceneStatus status)
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, created.Id);
        await _builder.PlayAsync(sceneId, status);

        var outcome = await DeleteAsync(created.Id);

        Assert.Equal(MythosCreatureDeleteOutcome.LinkedToPlayedScene, outcome);
        Assert.Equal(1, await _builder.StoredMythosCreatureCountAsync());
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_linked_only_to_prepared_scenes_When_deleting_Then_it_is_deleted_with_its_links()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, created.Id);

        var outcome = await DeleteAsync(created.Id);

        Assert.Equal(MythosCreatureDeleteOutcome.Deleted, outcome);
        Assert.Equal((0, 0), (await _builder.StoredMythosCreatureCountAsync(), await _builder.StoredLinkCountAsync()));
        Assert.Empty((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.NonPlayerEntityLinks);
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_of_another_Campaign_When_deleting_Then_it_is_NotFound_before_the_usage_check()
    {
        var other = await _builder.CreateMythosCreatureAsync(_builder.OtherCampaignOfSameKeeperId);
        var usage = new RecordingNonPlayerEntityUsage(true);

        var outcome = await DeleteAsync(other.Id, usage);

        Assert.Equal(MythosCreatureDeleteOutcome.NotFound, outcome);
        Assert.Empty(usage.Calls);
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_found_When_deleting_Then_the_usage_is_checked_for_its_Campaign_type_and_id()
    {
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        var usage = new RecordingNonPlayerEntityUsage(false);

        await DeleteAsync(created.Id, usage);

        Assert.Equal((_builder.CampaignId, NonPlayerEntityType.MythosCreature, created.Id), Assert.Single(usage.Calls));
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_linked_to_a_scene_When_duplicating_it_Then_the_copy_has_no_links()
    {
        var (scenarioId, sceneId) = await SceneAsync();
        var created = await _builder.CreateMythosCreatureAsync(_builder.CampaignId);
        await _builder.LinkAsync(_builder.CampaignId, scenarioId, sceneId, NonPlayerEntityType.MythosCreature, created.Id);
        using (var context = _builder.Fixture.CreateContext())
        {
            Assert.NotNull(await _builder.CreateMythosCreatureService(context).DuplicateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, CancellationToken.None));
        }

        var link = Assert.Single((await _builder.GetSceneAsync(_builder.CampaignId, scenarioId, sceneId))!.NonPlayerEntityLinks);
        Assert.Equal(created.Id, link.NonPlayerEntity.Id);
        Assert.Equal(1, await _builder.StoredLinkCountAsync());
    }
}
