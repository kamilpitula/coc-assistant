namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Human NPC use cases for the Keeper, and the Keeper-only rule: every other caller ends in NotFound before any profile
/// is read or written (specs/scenario-preparation/spec.md; ADR 0013).
/// </summary>
public class HumanNpcServiceTests : IDisposable
{
    private readonly ScenarioPreparationTestBuilder _builder = new();

    public void Dispose() => _builder.Dispose();

    private async Task<HumanNpcWriteResult> EditAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId, string name, NpcProfile profile, IHumanNpcRepository? repository = null)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHumanNpcService(context, repository).EditAsync(campaignId, callerAccountId, humanNpcId, name, profile, CancellationToken.None);
    }

    private async Task<HumanNpcView?> GetAsync(Guid campaignId, Guid callerAccountId, Guid humanNpcId)
    {
        using var context = _builder.Fixture.CreateContext();
        return await _builder.CreateHumanNpcService(context).GetAsync(campaignId, callerAccountId, humanNpcId, CancellationToken.None);
    }

    [Fact]
    public async Task Given_the_Keeper_When_creating_a_Human_NPC_Then_it_is_stored_with_its_name_and_age_and_narrative_only()
    {
        var view = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott", 62);

        var stored = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, view.Id);
        Assert.Equal(("Mr. Knott", 62), (stored!.Name, stored.Profile.Age));
        Assert.Null(stored.Profile.Skills);
        Assert.Equal(new NpcDerivedValues(null, null, null, null, null, false), stored.Derived);
    }

    [Fact]
    public async Task Given_a_missing_name_or_age_When_creating_Then_it_is_invalid_and_nothing_is_stored()
    {
        using var context = _builder.Fixture.CreateContext();

        var result = await _builder.CreateHumanNpcService(context).CreateAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, null, null, CancellationToken.None);

        Assert.Equal(HumanNpcWriteOutcome.Invalid, result.Outcome);
        Assert.Equal(["name", "age"], result.Problems.Select(problem => problem.Path));
        Assert.Equal(0, await _builder.StoredHumanNpcCountAsync());
    }

    [Fact]
    public async Task Given_a_saved_edit_When_reading_Then_the_view_carries_derived_values_and_difficulty()
    {
        var created = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Thug", 30);
        var profile = NpcProfileSamples.Thug() with
        {
            Skills = [NpcProfileSamples.Skill("Spot Hidden", 55), NpcProfileSamples.Skill("Listen", 20)],
            Combat = NpcProfileSamples.Combat() with { Dodge = 90 },
        };

        var result = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, "Thug", profile);

        Assert.Equal(HumanNpcWriteOutcome.Saved, result.Outcome);
        var view = (await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id))!;
        Assert.Equal(new NpcDerivedValues(12, 10, "+1D4", 1, 8, false), view.Derived);
        Assert.Equal([InvestigatorDifficulty.Hard, InvestigatorDifficulty.Regular], view.SkillDifficulties);
        Assert.Equal(InvestigatorDifficulty.Extreme, view.DodgeDifficulty);
        Assert.Equal(InvestigatorDifficulty.Hard, view.CharacteristicDifficulties["STR"]);
        Assert.Equal(InvestigatorDifficulty.Hard, view.CharacteristicDifficulties["POW"]);
        Assert.False(view.CharacteristicDifficulties.ContainsKey("APP"));
    }

    [Fact]
    public async Task Given_a_refused_edit_When_reading_Then_the_profile_is_unchanged()
    {
        var created = await _builder.CreateHumanNpcAsync(_builder.CampaignId, "Mr. Knott", 62);
        var weapon = NpcProfileSamples.Weapon(damage: "1D10+DB");
        var profile = NpcProfileSamples.Narrative() with { Skills = [NpcProfileSamples.Skill("Firearms", 60, "Handgun")], Combat = NpcProfileSamples.Combat(weapon) };

        var result = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, "Renamed", profile);

        Assert.Equal(HumanNpcWriteOutcome.Invalid, result.Outcome);
        Assert.Equal([new NpcProfileProblem("combat.weapons[0].damage", NpcProfileProblemKind.DamageBonusOnFirearm)], result.Problems);
        var view = (await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id))!;
        Assert.Equal(("Mr. Knott", null), (view.Name, view.Profile.Skills));
    }

    [Fact]
    public async Task Given_the_Keeper_When_deleting_Then_the_Human_NPC_is_gone()
    {
        var created = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        using (var context = _builder.Fixture.CreateContext())
        {
            var outcome = await _builder.CreateHumanNpcService(context).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, created.Id, CancellationToken.None);
            Assert.Equal(HumanNpcDeleteOutcome.Deleted, outcome);
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
        var created = await _builder.CreateHumanNpcAsync(_builder.CampaignId);
        var (campaignId, accountId) = Caller(caller);
        var recording = new RecordingHumanNpcRepository(null!);
        using var context = _builder.Fixture.CreateContext();
        var service = _builder.CreateHumanNpcService(context, recording);

        var get = await service.GetAsync(campaignId, accountId, created.Id, CancellationToken.None);
        var create = await service.CreateAsync(campaignId, accountId, "Intruder", 30, CancellationToken.None);
        var edit = await service.EditAsync(campaignId, accountId, created.Id, "Hacked", NpcProfileSamples.Narrative(1), CancellationToken.None);
        var delete = await service.DeleteAsync(campaignId, accountId, created.Id, CancellationToken.None);

        Assert.Null(get);
        Assert.Equal(HumanNpcWriteOutcome.NotFound, create.Outcome);
        Assert.Equal(HumanNpcWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(HumanNpcDeleteOutcome.NotFound, delete);
        Assert.Empty(recording.Calls);
        Assert.Equal(1, await _builder.StoredHumanNpcCountAsync());
    }

    [Fact]
    public async Task Given_a_Human_NPC_of_another_Campaign_When_the_Keeper_uses_its_id_Then_it_is_NotFound_and_unchanged()
    {
        var other = await _builder.CreateHumanNpcAsync(_builder.OtherCampaignOfSameKeeperId, "Elsewhere");

        var read = await GetAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id);
        var edit = await EditAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id, "Hijacked", NpcProfileSamples.Narrative(1));
        using var context = _builder.Fixture.CreateContext();
        var delete = await _builder.CreateHumanNpcService(context).DeleteAsync(_builder.CampaignId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id, CancellationToken.None);

        Assert.Null(read);
        Assert.Equal(HumanNpcWriteOutcome.NotFound, edit.Outcome);
        Assert.Equal(HumanNpcDeleteOutcome.NotFound, delete);
        var untouched = await GetAsync(_builder.OtherCampaignOfSameKeeperId, ScenarioPreparationTestBuilder.KeeperAccountId, other.Id);
        Assert.Equal(("Elsewhere", 62), (untouched!.Name, untouched.Profile.Age));
    }
}
