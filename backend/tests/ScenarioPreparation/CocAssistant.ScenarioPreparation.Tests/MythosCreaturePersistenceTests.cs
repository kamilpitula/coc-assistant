namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Storing a Mythos Creature: the versioned JSON profile, the Campaign scoping of lookups, and the cross-table list.</summary>
public class MythosCreaturePersistenceTests : IDisposable
{
    private readonly SqliteScenarioPreparationDbContextFixture _fixture = new();

    public void Dispose() => _fixture.Dispose();

    private static MonsterProfile FullProfile() => MonsterProfileSamples.Ghoul() with
    {
        Details = MonsterDetails.Empty with { CreatureKind = "Mythos", Origin = "Crypts", DefeatOutcome = "Dissolves" },
        KeeperNotes = NpcProfileSamples.ValidKeeperNotes,
        Characteristics = MonsterProfileSamples.Characteristics(("STR", 80), ("CON", 60), ("SIZ", 60), ("APP", 5)) with
        {
            HitPointsNotApplicable = true,
            Overrides = new MonsterOverrides(null, new NumberOverride(20, "Hungry"), new DamageBonusOverride("+2D6", "Strong"), new NumberOverride(-1, "Hunched")),
        },
        Movement = [new MonsterMovementMode("Walk", null, 8), new MonsterMovementMode("Other", "Phasing", 10)],
        Combat = new MonsterCombat(3, 30, [MonsterProfileSamples.Attack(effect: "Grapples"), MonsterProfileSamples.Attack(name: "Shove", damage: null, manoeuvre: true)]),
        Defenses = new MonsterDefenses(2, "Leathery hide", [new MonsterDefenseEntry("Bullets")], [new MonsterDefenseEntry("Fire")]),
        Skills = [new MonsterSkill("Stealth", 70)],
        Spells = [new MonsterSpell("Contact Deity", "5", "Summons a god")],
        Powers = [new MonsterPower("Drain", "1", "Drains", "Once per day")],
        SanityLoss = new MonsterSanityLoss("0/1D6"),
    };

    private static MythosCreature FullCreature(Guid campaignId, string name = "Ghoul")
    {
        var creature = Domain.MythosCreature.Create(campaignId, name, MonsterProfileSamples.Now).MythosCreature!;
        Assert.Empty(creature.Edit(name, FullProfile()));
        return creature;
    }

    [Fact]
    public void Given_a_profile_When_stored_Then_it_is_versioned_JSON_with_the_Keeper_notes_as_a_nested_element()
    {
        using var document = JsonDocument.Parse(MonsterProfileJsonStorage.ToStorage(FullProfile()));

        Assert.Equal(1, document.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Equal(JsonValueKind.Object, document.RootElement.GetProperty("keeperNotes").ValueKind);
        Assert.Equal("Mythos", document.RootElement.GetProperty("details").GetProperty("creatureKind").GetString());
    }

    [Fact]
    public void Given_a_stored_profile_When_read_back_Then_every_section_override_and_the_Keeper_notes_are_restored()
    {
        var stored = MonsterProfileJsonStorage.ToStorage(FullProfile());

        var profile = MonsterProfileJsonStorage.FromStorage(stored);

        Assert.Equal(stored, MonsterProfileJsonStorage.ToStorage(profile));
        Assert.Equal(NpcProfileSamples.ValidKeeperNotes, profile.KeeperNotes);
        Assert.Equal((80, 5, true), (profile.Characteristics!.Values["STR"], profile.Characteristics.Values["APP"], profile.Characteristics.HitPointsNotApplicable));
        Assert.Equal(new NumberOverride(20, "Hungry"), profile.Characteristics.Overrides.MagicPoints);
        Assert.Equal(new DamageBonusOverride("+2D6", "Strong"), profile.Characteristics.Overrides.DamageBonus);
        Assert.Equal(new NumberOverride(-1, "Hunched"), profile.Characteristics.Overrides.Build);
        Assert.Null(profile.Characteristics.Overrides.HitPoints);
        Assert.Equal("Phasing", profile.Movement![1].Label);
        Assert.Equal((3, 30, true), (profile.Combat!.AttacksPerRound, profile.Combat.Dodge, profile.Combat.Attacks[1].Manoeuvre));
        Assert.Equal("Fire", profile.Defenses!.Vulnerabilities[0].Description);
        Assert.Equal("Once per day", profile.Powers![0].Limits);
        Assert.Equal("0/1D6", profile.SanityLoss!.Value);
    }

    [Fact]
    public void Given_an_empty_profile_When_read_back_Then_the_sections_stay_absent()
    {
        var profile = MonsterProfileJsonStorage.FromStorage(MonsterProfileJsonStorage.ToStorage(MonsterProfile.Empty));

        Assert.Equal(
            (null, null, null, null, null, null, null, null),
            (profile.KeeperNotes, profile.Characteristics, profile.Movement, profile.Combat, profile.Defenses, profile.Skills, profile.Spells, profile.SanityLoss));
        Assert.Null(profile.Powers);
    }

    [Fact]
    public void Given_an_added_empty_section_When_read_back_Then_the_section_is_still_there_and_empty()
    {
        var profile = MonsterProfile.Empty with { Movement = [], Skills = [], Combat = new MonsterCombat(null, null, []), SanityLoss = new MonsterSanityLoss(null) };

        var restored = MonsterProfileJsonStorage.FromStorage(MonsterProfileJsonStorage.ToStorage(profile));

        Assert.Empty(restored.Movement!);
        Assert.Empty(restored.Skills!);
        Assert.Empty(restored.Combat!.Attacks);
        Assert.NotNull(restored.SanityLoss);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public void Given_an_unsupported_schema_version_When_read_Then_it_is_refused(int version)
    {
        var stored = $"{{\"schemaVersion\":{version},\"details\":{{}}}}";

        Assert.Throws<InvalidOperationException>(() => MonsterProfileJsonStorage.FromStorage(stored));
    }

    [Fact]
    public async Task Given_a_saved_Mythos_Creature_When_loaded_in_a_new_context_Then_its_name_and_profile_are_restored()
    {
        var campaignId = Guid.NewGuid();
        var creature = FullCreature(campaignId);
        using (var context = _fixture.CreateContext())
        {
            new EfMythosCreatureRepository(context).Add(creature);
            await context.SaveChangesAsync();
        }

        using var reading = _fixture.CreateContext();
        var loaded = await new EfMythosCreatureRepository(reading).FindByIdAsync(campaignId, creature.Id, CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal((creature.Name, creature.CampaignId, creature.CreatedAt), (loaded.Name, loaded.CampaignId, loaded.CreatedAt));
        Assert.Equal(MonsterProfileJsonStorage.ToStorage(creature.Profile), MonsterProfileJsonStorage.ToStorage(loaded.Profile));
    }

    [Fact]
    public async Task Given_a_changed_profile_When_saved_Then_the_change_is_persisted()
    {
        var campaignId = Guid.NewGuid();
        var creature = FullCreature(campaignId);
        using (var context = _fixture.CreateContext())
        {
            new EfMythosCreatureRepository(context).Add(creature);
            await context.SaveChangesAsync();
        }

        using (var editing = _fixture.CreateContext())
        {
            var repository = new EfMythosCreatureRepository(editing);
            var tracked = await repository.FindByIdAsync(campaignId, creature.Id, CancellationToken.None);
            tracked!.Edit("Ghoul Elder", MonsterProfile.Empty);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var reading = _fixture.CreateContext();
        var loaded = await new EfMythosCreatureRepository(reading).FindByIdAsync(campaignId, creature.Id, CancellationToken.None);
        Assert.Equal(("Ghoul Elder", null), (loaded!.Name, loaded.Profile.Characteristics));
    }

    [Fact]
    public async Task Given_a_Mythos_Creature_of_another_Campaign_When_found_by_id_Then_it_is_not_found()
    {
        var creature = FullCreature(Guid.NewGuid());
        using (var context = _fixture.CreateContext())
        {
            new EfMythosCreatureRepository(context).Add(creature);
            await context.SaveChangesAsync();
        }

        using var reading = _fixture.CreateContext();
        Assert.Null(await new EfMythosCreatureRepository(reading).FindByIdAsync(Guid.NewGuid(), creature.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_a_removed_Mythos_Creature_When_saved_Then_it_is_gone()
    {
        var campaignId = Guid.NewGuid();
        var creature = FullCreature(campaignId);
        using (var context = _fixture.CreateContext())
        {
            var repository = new EfMythosCreatureRepository(context);
            repository.Add(creature);
            await repository.SaveChangesAsync(CancellationToken.None);
            repository.Remove(creature);
            await repository.SaveChangesAsync(CancellationToken.None);
        }

        using var reading = _fixture.CreateContext();
        Assert.Null(await new EfMythosCreatureRepository(reading).FindByIdAsync(campaignId, creature.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Given_both_types_in_two_Campaigns_When_listed_Then_this_Campaigns_come_back_by_name_then_id_with_their_types()
    {
        var campaignId = Guid.NewGuid();
        using (var context = _fixture.CreateContext())
        {
            context.HumanNpcs.Add(Domain.HumanNpc.Create(campaignId, "Mr. Knott", 62, MonsterProfileSamples.Now).HumanNpc!);
            context.HumanNpcs.Add(Domain.HumanNpc.Create(campaignId, "Ghoul", 30, MonsterProfileSamples.Now).HumanNpc!);
            context.MythosCreatures.Add(FullCreature(campaignId, "Ghoul"));
            context.MythosCreatures.Add(FullCreature(campaignId, "Abel"));
            context.MythosCreatures.Add(FullCreature(Guid.NewGuid(), "Other Campaign"));
            await context.SaveChangesAsync();
        }

        using var reading = _fixture.CreateContext();
        var items = await new EfNonPlayerEntityDirectory(reading).ListForCampaignAsync(campaignId, CancellationToken.None);

        Assert.Equal(["Abel", "Ghoul", "Ghoul", "Mr. Knott"], items.Select(item => item.Name));
        Assert.Equal(NonPlayerEntityType.MythosCreature, items[0].Type);
        Assert.Equal(
            [NonPlayerEntityType.HumanNpc, NonPlayerEntityType.MythosCreature],
            items.Where(item => item.Name == "Ghoul").Select(item => item.Type).Order());
    }
}
