namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>What a saved Monster Profile keeps: trimmed text, canonical casing, and all eight characteristics in rule order.</summary>
public class MonsterProfileNormalizerTests
{
    private static MonsterProfile Saved(MonsterProfile profile)
    {
        var creature = MonsterProfileSamples.MythosCreature();
        Assert.Empty(creature.Edit("Ghoul", profile));
        return creature.Profile;
    }

    [Fact]
    public void Given_Creature_Kind_and_movement_mode_in_any_case_When_saved_Then_the_canonical_casing_is_stored()
    {
        var saved = Saved(MonsterProfile.Empty with
        {
            Details = MonsterDetails.Empty with { CreatureKind = " folklore " },
            Movement = [new MonsterMovementMode("BURROW", null, 4), new MonsterMovementMode("other", " Phasing ", 10)],
        });

        Assert.Equal("Folklore", saved.Details.CreatureKind);
        Assert.Equal(["Burrow", "Other"], saved.Movement!.Select(mode => mode.Mode));
        Assert.Equal("Phasing", saved.Movement![1].Label);
    }

    [Fact]
    public void Given_blank_text_When_saved_Then_it_is_stored_as_null_and_other_text_is_trimmed()
    {
        var saved = Saved(MonsterProfileSamples.Ghoul() with
        {
            Details = MonsterDetails.Empty with { Origin = "  Crypts ", SignsAndTraces = "   " },
            Combat = new MonsterCombat(3, 30, [MonsterProfileSamples.Attack(name: " Claw ", skill: " Fighting ", damage: " 1D6+DB ", effect: "  ")]),
            SanityLoss = new MonsterSanityLoss(" 0/1D6 "),
        });

        Assert.Equal(("Crypts", null), (saved.Details.Origin, saved.Details.SignsAndTraces));
        var attack = saved.Combat!.Attacks[0];
        Assert.Equal(("Claw", "Fighting", "1D6+DB", null), (attack.Name, attack.Skill, attack.Damage, attack.Effect));
        Assert.Equal("0/1D6", saved.SanityLoss!.Value);
    }

    [Fact]
    public void Given_some_characteristics_When_saved_Then_all_eight_are_kept_in_the_Monster_Profile_order()
    {
        var saved = Saved(MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("POW", 60), ("STR", 80))));

        Assert.Equal(["STR", "CON", "SIZ", "DEX", "INT", "POW", "APP", "EDU"], saved.Characteristics!.Values.Keys);
        Assert.Equal((80, null, 60), (saved.Characteristics.Values["STR"], saved.Characteristics.Values["CON"], saved.Characteristics.Values["POW"]));
    }

    [Fact]
    public void Given_overrides_When_saved_Then_values_and_reasons_are_trimmed_and_the_flag_is_kept()
    {
        var saved = Saved(MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.WithOverrides(
            new MonsterOverrides(null, new NumberOverride(5, "  Reason  "), new DamageBonusOverride(" +1D4 ", " Because "), null),
            hitPointsNotApplicable: false)));

        var overrides = saved.Characteristics!.Overrides;
        Assert.Null(overrides.HitPoints);
        Assert.Equal(new NumberOverride(5, "Reason"), overrides.MagicPoints);
        Assert.Equal(new DamageBonusOverride("+1D4", "Because"), overrides.DamageBonus);
    }

    [Fact]
    public void Given_an_added_empty_section_When_saved_Then_the_section_is_kept()
    {
        var saved = Saved(MonsterProfile.Empty with { Skills = [], Movement = [], Combat = new MonsterCombat(null, null, []), SanityLoss = new MonsterSanityLoss(" ") });

        Assert.Empty(saved.Skills!);
        Assert.Empty(saved.Movement!);
        Assert.Empty(saved.Combat!.Attacks);
        Assert.Null(saved.SanityLoss!.Value);
    }

    [Fact]
    public void Given_Keeper_notes_When_saved_Then_they_are_kept_exactly_as_received()
    {
        var saved = Saved(MonsterProfile.Empty with { KeeperNotes = NpcProfileSamples.ValidKeeperNotes });

        Assert.Equal(NpcProfileSamples.ValidKeeperNotes, saved.KeeperNotes);
    }
}
