namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Storing a Human NPC: the versioned JSON profile, the Campaign scoping of lookups, and the cross-table list.</summary>
public class HumanNpcPersistenceTests : IDisposable
{
    private readonly SqliteScenarioPreparationDbContextFixture _fixture = new();

    public void Dispose() => _fixture.Dispose();

    private static NpcProfile FullProfile() => NpcProfileSamples.Thug() with
    {
        Details = NpcDetails.Empty with { ProfessionOrRole = "Landlord", Secrets = "Knows about the cellar" },
        KeeperNotes = NpcProfileSamples.ValidKeeperNotes,
        Skills = [NpcProfileSamples.Skill("Firearms", 60, "Handgun"), NpcProfileSamples.Skill("Spot Hidden", 55)],
        Combat = new NpcCombat(
            40,
            1,
            "Flees at half Hit Points",
            [new NpcWeapon("Revolver", new NpcSkillReference("Firearms", "Handgun"), "1D10", 2, "15 yards", "6", "100", true)]),
        Spells = [NpcProfileSamples.Spell("Contact Deity", "5", "Summons a god")],
    };

    private static HumanNpc FullHumanNpc(Guid campaignId, string name = "Mr. Knott")
    {
        var human = Domain.HumanNpc.Create(campaignId, name, 62, NpcProfileSamples.Now).HumanNpc!;
        Assert.Empty(human.Edit(name, FullProfile(), NpcProfileSamples.Specializations));
        return human;
    }

    [Fact]
    public void Given_a_profile_When_stored_Then_it_is_versioned_JSON_with_the_Keeper_notes_as_a_nested_element()
    {
        using var document = JsonDocument.Parse(HumanNpcProfileJsonStorage.ToStorage(FullProfile()));

        Assert.Equal(1, document.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Equal(JsonValueKind.Object, document.RootElement.GetProperty("keeperNotes").ValueKind);
        Assert.Equal(30, document.RootElement.GetProperty("age").GetInt32());
    }

    [Fact]
    public void Given_a_stored_profile_When_read_back_Then_every_section_is_restored()
    {
        var stored = HumanNpcProfileJsonStorage.ToStorage(FullProfile());

        var profile = HumanNpcProfileJsonStorage.FromStorage(stored);

        Assert.Equal(stored, HumanNpcProfileJsonStorage.ToStorage(profile));
        Assert.Equal((30, "Landlord", NpcProfileSamples.ValidKeeperNotes), (profile.Age, profile.Details.ProfessionOrRole, profile.KeeperNotes));
        Assert.Equal(70, profile.Characteristics!.Values["STR"]);
        Assert.Equal("Handgun", profile.Skills![0].Specialization);
        Assert.Equal((40, 1, 2, true), (profile.Combat!.Dodge, profile.Combat.ArmorPoints, profile.Combat.Weapons[0].AttacksPerRound, profile.Combat.Weapons[0].Impaling));
        Assert.Equal("Summons a god", profile.Spells![0].Effect);
    }

    [Fact]
    public void Given_a_narrative_profile_When_read_back_Then_the_sections_stay_absent()
    {
        var profile = HumanNpcProfileJsonStorage.FromStorage(HumanNpcProfileJsonStorage.ToStorage(NpcProfileSamples.Narrative(62)));

        Assert.Equal((62, null, null, null, null, null), (profile.Age, profile.KeeperNotes, profile.Characteristics, profile.Skills, profile.Combat, profile.Spells));
    }

    [Fact]
    public void Given_an_added_empty_section_When_read_back_Then_the_section_is_still_there_and_empty()
    {
        var profile = NpcProfileSamples.Narrative() with { Skills = [], Spells = [], Combat = NpcProfileSamples.Combat() };

        var restored = HumanNpcProfileJsonStorage.FromStorage(HumanNpcProfileJsonStorage.ToStorage(profile));

        Assert.Empty(restored.Skills!);
        Assert.Empty(restored.Spells!);
        Assert.Empty(restored.Combat!.Weapons);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public void Given_an_unsupported_schema_version_When_read_Then_it_is_refused(int version)
    {
        var stored = $"{{\"schemaVersion\":{version},\"age\":30,\"details\":{{}}}}";

        Assert.Throws<InvalidOperationException>(() => HumanNpcProfileJsonStorage.FromStorage(stored));
    }

    [Fact]
    public async Task Given_a_saved_Human_NPC_When_loaded_in_a_new_context_Then_its_name_and_profile_are_restored()
    {
        var campaignId = Guid.NewGuid();
        var human = FullHumanNpc(campaignId);
        using (var context = _fixture.CreateContext())
        {
            new EfHumanNpcRepository(context).Add(human);
            await context.SaveChangesAsync();
        }

        using var reading = _fixture.CreateContext();
        var loaded = await new EfHumanNpcRepository(reading).FindByIdAsync(campaignId, human.Id, CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal((human.Name, human.CampaignId, human.CreatedAt), (loaded.Name, loaded.CampaignId, loaded.CreatedAt));
        Assert.Equal(HumanNpcProfileJsonStorage.ToStorage(human.Profile), HumanNpcProfileJsonStorage.ToStorage(loaded.Profile));
    }

    [Fact]
    public async Task Given_a_changed_profile_When_saved_Then_the_change_is_persisted()
    {
        var campaignId = Guid.NewGuid();
        var human = FullHumanNpc(campaignId);
        using (var context = _fixture.CreateContext())
        {
            new EfHumanNpcRepository(context).Add(human);
            await context.SaveChangesAsync();
        }

        using (var editing = _fixture.CreateContext())
        {
            var repository = new EfHumanNpcRepository(editing);
            var tracked = await repository.FindByIdAsync(campaignId, human.Id, CancellationToken.None);
            tracked!.Edit("Mr. Knott, Landlord", NpcProfileSamples.Narrative(63), NpcProfileSamples.Specializations);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var reading = _fixture.CreateContext();
        var loaded = await new EfHumanNpcRepository(reading).FindByIdAsync(campaignId, human.Id, CancellationToken.None);
        Assert.Equal(("Mr. Knott, Landlord", 63, null), (loaded!.Name, loaded.Profile.Age, loaded.Profile.Skills));
    }

    [Fact]
    public async Task Given_a_Human_NPC_of_another_Campaign_When_found_by_id_Then_it_is_not_found()
    {
        var human = FullHumanNpc(Guid.NewGuid());
        using (var context = _fixture.CreateContext())
        {
            new EfHumanNpcRepository(context).Add(human);
            await context.SaveChangesAsync();
        }

        using var reading = _fixture.CreateContext();
        Assert.Null(await new EfHumanNpcRepository(reading).FindByIdAsync(Guid.NewGuid(), human.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_removed_Human_NPC_When_saved_Then_it_is_gone()
    {
        var campaignId = Guid.NewGuid();
        var human = FullHumanNpc(campaignId);
        using (var context = _fixture.CreateContext())
        {
            var repository = new EfHumanNpcRepository(context);
            repository.Add(human);
            await repository.SaveChangesAsync(CancellationToken.None);
            repository.Remove(human);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var reading = _fixture.CreateContext();
        Assert.Null(await new EfHumanNpcRepository(reading).FindByIdAsync(campaignId, human.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_Human_NPCs_in_two_Campaigns_When_listed_Then_only_this_Campaigns_come_back_by_name_then_id()
    {
        var campaignId = Guid.NewGuid();
        using (var context = _fixture.CreateContext())
        {
            var repository = new EfHumanNpcRepository(context);
            repository.Add(FullHumanNpc(campaignId, "Zed"));
            repository.Add(FullHumanNpc(campaignId, "Abel"));
            repository.Add(FullHumanNpc(Guid.NewGuid(), "Other Campaign"));
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var reading = _fixture.CreateContext();
        var items = await new EfNonPlayerEntityDirectory(reading).ListForCampaignAsync(campaignId, CancellationToken.None);

        Assert.Equal([("Abel", NonPlayerEntityType.HumanNpc), ("Zed", NonPlayerEntityType.HumanNpc)], items.Select(item => (item.Name, item.Type)));
    }
}
