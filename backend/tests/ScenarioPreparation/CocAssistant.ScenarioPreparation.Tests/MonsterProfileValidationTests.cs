namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The structural problems that block saving a Monster Profile, each reported on its request path
/// (docs/game-rules/project_ruleset.md sections 5.2, 5.4, 5.5, 5.8, 5.9; ADR 0018).
/// </summary>
public class MonsterProfileValidationTests
{
    private static IReadOnlyList<MonsterProfileProblem> Check(MonsterProfile profile) =>
        MonsterProfileValidation.Validate("Ghoul", profile);

    private static MonsterProfileProblem Problem(string path, MonsterProfileProblemKind kind) => new(path, kind);

    private static MonsterProfile WithOverrides(MonsterOverrides overrides, bool notApplicable = false, string? defeatOutcome = null) =>
        MonsterProfile.Empty with
        {
            Details = MonsterDetails.Empty with { DefeatOutcome = defeatOutcome },
            Characteristics = MonsterProfileSamples.WithOverrides(overrides, notApplicable),
        };

    [Fact]
    public void Given_a_complete_valid_profile_When_validated_Then_there_are_no_problems()
    {
        var profile = MonsterProfileSamples.Ghoul() with
        {
            KeeperNotes = NpcProfileSamples.ValidKeeperNotes,
            Movement = [new MonsterMovementMode("Walk", null, 8), new MonsterMovementMode("other", "Phasing", 10)],
            Defenses = new MonsterDefenses(2, "Hide", [new MonsterDefenseEntry("Ordinary bullets")], [new MonsterDefenseEntry("Fire")]),
            Skills = [new MonsterSkill("Spot Hidden", 60)],
            Spells = [new MonsterSpell("Contact Deity", "5", null)],
            Powers = [new MonsterPower("Drain", "1", null, "Once per day")],
        };

        Assert.Empty(Check(profile));
    }

    [Theory]
    [InlineData(2_001)]
    [InlineData(-1)]
    public void Given_a_characteristic_outside_0_to_2000_When_validated_Then_it_is_reported_on_its_code(int value)
    {
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("STR", value)));

        Assert.Equal([Problem("characteristics.values.STR", MonsterProfileProblemKind.CharacteristicOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_characteristics_at_0_and_2000_When_validated_Then_they_are_accepted()
    {
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("STR", 0), ("APP", 2_000)));

        Assert.Empty(Check(profile));
    }

    [Fact]
    public void Given_an_unknown_characteristic_code_When_validated_Then_it_is_reported_on_that_code()
    {
        var profile = MonsterProfileSamples.WithCharacteristics(MonsterProfileSamples.Characteristics(("LUCK", 50)));

        Assert.Equal([Problem("characteristics.values.LUCK", MonsterProfileProblemKind.UnknownCharacteristic)], Check(profile));
    }

    [Theory]
    [InlineData("Dragon")]
    [InlineData("1")]
    public void Given_an_unknown_Creature_Kind_When_validated_Then_it_is_reported_on_details(string kind)
    {
        var profile = MonsterProfile.Empty with { Details = MonsterDetails.Empty with { CreatureKind = kind } };

        Assert.Equal([Problem("details.creatureKind", MonsterProfileProblemKind.CreatureKindNotListed)], Check(profile));
    }

    [Theory]
    [InlineData("beast")]
    [InlineData("FOLKLORE")]
    [InlineData(" Unique ")]
    public void Given_a_listed_Creature_Kind_in_any_case_When_validated_Then_it_is_accepted(string kind)
    {
        var profile = MonsterProfile.Empty with { Details = MonsterDetails.Empty with { CreatureKind = kind } };

        Assert.Empty(Check(profile));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(10_000)]
    public void Given_a_Hit_Points_override_outside_1_to_9999_When_validated_Then_it_is_reported_on_value(int value)
    {
        var profile = WithOverrides(MonsterOverrides.None with { HitPoints = new NumberOverride(value, "Swollen") });

        Assert.Equal([Problem("characteristics.overrides.hitPoints.value", MonsterProfileProblemKind.HitPointsOverrideOutOfRange)], Check(profile));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10_000)]
    public void Given_a_Magic_Points_override_outside_0_to_9999_When_validated_Then_it_is_reported_on_value(int value)
    {
        var profile = WithOverrides(MonsterOverrides.None with { MagicPoints = new NumberOverride(value, "Reason") });

        Assert.Equal([Problem("characteristics.overrides.magicPoints.value", MonsterProfileProblemKind.MagicPointsOverrideOutOfRange)], Check(profile));
    }

    [Theory]
    [InlineData(-3)]
    [InlineData(100)]
    public void Given_a_Build_override_outside_minus_2_to_99_When_validated_Then_it_is_reported_on_value(int value)
    {
        var profile = WithOverrides(MonsterOverrides.None with { Build = new NumberOverride(value, "Reason") });

        Assert.Equal([Problem("characteristics.overrides.build.value", MonsterProfileProblemKind.BuildOverrideOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_overrides_at_their_limits_When_validated_Then_they_are_accepted()
    {
        var overrides = new MonsterOverrides(
            new NumberOverride(1, "Reason"),
            new NumberOverride(0, "Reason"),
            new DamageBonusOverride("0", "Reason"),
            new NumberOverride(-2, "Reason"));

        Assert.Empty(Check(WithOverrides(overrides)));
        Assert.Empty(Check(WithOverrides(MonsterOverrides.None with { HitPoints = new NumberOverride(9_999, "Reason"), Build = new NumberOverride(99, "Reason") })));
    }

    [Theory]
    [InlineData("1D")]
    [InlineData("DB")]
    [InlineData("+DB")]
    [InlineData("+-1")]
    public void Given_a_malformed_Damage_Bonus_override_When_validated_Then_it_is_reported_on_value(string value)
    {
        var profile = WithOverrides(MonsterOverrides.None with { DamageBonus = new DamageBonusOverride(value, "Reason") });

        Assert.Equal([Problem("characteristics.overrides.damageBonus.value", MonsterProfileProblemKind.DamageBonusOverrideMalformed)], Check(profile));
    }

    [Theory]
    [InlineData("+1D4")]
    [InlineData("-1")]
    [InlineData("+2D6+1")]
    public void Given_a_well_formed_Damage_Bonus_override_When_validated_Then_it_is_accepted(string value)
    {
        Assert.Empty(Check(WithOverrides(MonsterOverrides.None with { DamageBonus = new DamageBonusOverride(value, "Reason") })));
    }

    [Fact]
    public void Given_an_override_without_a_value_When_validated_Then_it_is_reported_on_value()
    {
        var profile = WithOverrides(MonsterOverrides.None with
        {
            HitPoints = new NumberOverride(null, "Reason"),
            DamageBonus = new DamageBonusOverride("  ", "Reason"),
        });

        Assert.Equal(
            [
                Problem("characteristics.overrides.hitPoints.value", MonsterProfileProblemKind.OverrideValueRequired),
                Problem("characteristics.overrides.damageBonus.value", MonsterProfileProblemKind.OverrideValueRequired),
            ],
            Check(profile));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Given_an_override_without_a_reason_When_validated_Then_it_is_reported_on_reason(string? reason)
    {
        var profile = WithOverrides(MonsterOverrides.None with { HitPoints = new NumberOverride(25, reason) });

        Assert.Equal([Problem("characteristics.overrides.hitPoints.reason", MonsterProfileProblemKind.OverrideReasonRequired)], Check(profile));
    }

    [Fact]
    public void Given_a_reason_of_501_characters_When_validated_Then_it_is_refused_and_500_is_accepted()
    {
        var tooLong = WithOverrides(MonsterOverrides.None with { Build = new NumberOverride(3, MonsterProfileSamples.LongText(501)) });
        var longest = WithOverrides(MonsterOverrides.None with { Build = new NumberOverride(3, MonsterProfileSamples.LongText(500)) });

        Assert.Equal([Problem("characteristics.overrides.build.reason", MonsterProfileProblemKind.OverrideReasonTooLong)], Check(tooLong));
        Assert.Empty(Check(longest));
    }

    [Fact]
    public void Given_a_Damage_Bonus_override_of_1001_characters_When_validated_Then_it_is_reported_as_row_text_too_long()
    {
        var profile = WithOverrides(MonsterOverrides.None with { DamageBonus = new DamageBonusOverride(MonsterProfileSamples.LongText(1_001), "Reason") });

        Assert.Contains(Problem("characteristics.overrides.damageBonus.value", MonsterProfileProblemKind.RowTextTooLong), Check(profile));
    }

    [Fact]
    public void Given_Hit_Points_both_overridden_and_not_applicable_When_validated_Then_the_conflict_is_reported()
    {
        var profile = WithOverrides(MonsterOverrides.None with { HitPoints = new NumberOverride(25, "Reason") }, notApplicable: true, defeatOutcome: "Dissolves");

        Assert.Equal([Problem("characteristics.hitPointsNotApplicable", MonsterProfileProblemKind.HitPointsOverriddenAndNotApplicable)], Check(profile));
    }

    [Fact]
    public void Given_Hit_Points_not_applicable_without_a_defeat_outcome_When_validated_Then_it_is_reported_on_the_defeat_outcome()
    {
        var profile = WithOverrides(MonsterOverrides.None, notApplicable: true, defeatOutcome: "   ");

        Assert.Equal([Problem("details.defeatOutcome", MonsterProfileProblemKind.DefeatOutcomeRequired)], Check(profile));
    }

    [Fact]
    public void Given_Hit_Points_not_applicable_with_a_defeat_outcome_When_validated_Then_it_is_accepted()
    {
        Assert.Empty(Check(WithOverrides(MonsterOverrides.None, notApplicable: true, defeatOutcome: "It dissolves at dawn.")));
    }

    [Fact]
    public void Given_an_unlisted_movement_mode_When_validated_Then_it_is_reported_on_that_row()
    {
        var profile = MonsterProfile.Empty with { Movement = [new MonsterMovementMode("Walk", null, 8), new MonsterMovementMode("Teleport", null, 8), new MonsterMovementMode(null, null, 8)] };

        Assert.Equal(
            [
                Problem("movement[1].mode", MonsterProfileProblemKind.MovementModeNotListed),
                Problem("movement[2].mode", MonsterProfileProblemKind.MovementModeNotListed),
            ],
            Check(profile));
    }

    [Fact]
    public void Given_an_Other_movement_mode_without_a_label_When_validated_Then_it_is_reported_on_label()
    {
        var profile = MonsterProfile.Empty with { Movement = [new MonsterMovementMode("Other", "  ", 10)] };

        Assert.Equal([Problem("movement[0].label", MonsterProfileProblemKind.MovementLabelRequired)], Check(profile));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(1_000)]
    [InlineData(-1)]
    public void Given_a_movement_rate_missing_or_outside_0_to_999_When_validated_Then_it_is_reported_on_rate(int? rate)
    {
        var profile = MonsterProfile.Empty with { Movement = [new MonsterMovementMode("Walk", null, rate)] };

        Assert.Equal([Problem("movement[0].rate", MonsterProfileProblemKind.MovementRateOutOfRange)], Check(profile));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    public void Given_attacks_per_round_outside_1_to_99_When_validated_Then_it_is_reported(int attacks)
    {
        var profile = MonsterProfile.Empty with { Combat = new MonsterCombat(attacks, null, []) };

        Assert.Equal([Problem("combat.attacksPerRound", MonsterProfileProblemKind.AttacksPerRoundOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_Dodge_above_2000_When_validated_Then_it_is_reported_and_2000_is_accepted()
    {
        Assert.Equal(
            [Problem("combat.dodge", MonsterProfileProblemKind.DodgeOutOfRange)],
            Check(MonsterProfile.Empty with { Combat = new MonsterCombat(null, 2_001, []) }));
        Assert.Empty(Check(MonsterProfile.Empty with { Combat = new MonsterCombat(null, 2_000, []) }));
    }

    [Fact]
    public void Given_an_attack_without_a_name_skill_or_skill_value_When_validated_Then_each_is_reported_on_its_field()
    {
        var problems = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(name: " ", skill: null, skillValue: null)));

        Assert.Equal(
            [
                Problem("combat.attacks[0].name", MonsterProfileProblemKind.AttackNameRequired),
                Problem("combat.attacks[0].skill", MonsterProfileProblemKind.AttackSkillRequired),
                Problem("combat.attacks[0].skillValue", MonsterProfileProblemKind.AttackSkillValueOutOfRange),
            ],
            problems);
    }

    [Fact]
    public void Given_an_attack_skill_value_above_2000_When_validated_Then_it_is_reported()
    {
        var problems = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(skillValue: 2_001)));

        Assert.Equal([Problem("combat.attacks[0].skillValue", MonsterProfileProblemKind.AttackSkillValueOutOfRange)], problems);
    }

    [Fact]
    public void Given_an_attack_without_damage_When_validated_Then_it_is_required_unless_it_is_a_manoeuvre()
    {
        var required = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(damage: null)));
        var manoeuvre = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(damage: null, manoeuvre: true)));

        Assert.Equal([Problem("combat.attacks[0].damage", MonsterProfileProblemKind.AttackDamageRequired)], required);
        Assert.Empty(manoeuvre);
    }

    [Theory]
    [InlineData("D")]
    [InlineData("1D6+")]
    [InlineData("1 D6")]
    public void Given_malformed_attack_damage_When_validated_Then_it_is_reported_on_damage(string damage)
    {
        var problems = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(damage: damage)));

        Assert.Equal([Problem("combat.attacks[0].damage", MonsterProfileProblemKind.DamageMalformed)], problems);
    }

    [Theory]
    [InlineData("Firearms (Rifle)")]
    [InlineData("firearms")]
    [InlineData("  FIREARMS  (Handgun)")]
    public void Given_Damage_Bonus_in_a_Firearms_attack_When_validated_Then_it_is_refused(string skill)
    {
        var problems = Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(skill: skill, damage: "1D10+DB")));

        Assert.Equal([Problem("combat.attacks[0].damage", MonsterProfileProblemKind.DamageBonusOnFirearm)], problems);
    }

    [Theory]
    [InlineData("Fighting", "1D6+DB")]
    [InlineData("Firearms (Rifle)", "2D6+4")]
    [InlineData("Firearm", "1D6+DB")]
    public void Given_damage_that_suits_the_attack_skill_When_validated_Then_it_is_accepted(string skill, string damage)
    {
        Assert.Empty(Check(MonsterProfileSamples.WithAttacks(MonsterProfileSamples.Attack(skill: skill, damage: damage))));
    }

    [Fact]
    public void Given_armor_points_above_2000_When_validated_Then_it_is_reported()
    {
        var profile = MonsterProfile.Empty with { Defenses = new MonsterDefenses(2_001, null, [], []) };

        Assert.Equal([Problem("defenses.armorPoints", MonsterProfileProblemKind.ArmorPointsOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_an_immunity_and_a_vulnerability_without_a_description_When_validated_Then_each_is_reported_on_its_row()
    {
        var profile = MonsterProfile.Empty with
        {
            Defenses = new MonsterDefenses(null, null, [new MonsterDefenseEntry("Bullets"), new MonsterDefenseEntry(" ")], [new MonsterDefenseEntry(null)]),
        };

        Assert.Equal(
            [
                Problem("defenses.immunities[1].description", MonsterProfileProblemKind.ImmunityDescriptionRequired),
                Problem("defenses.vulnerabilities[0].description", MonsterProfileProblemKind.VulnerabilityDescriptionRequired),
            ],
            Check(profile));
    }

    [Fact]
    public void Given_a_skill_without_a_name_or_a_valid_value_When_validated_Then_each_is_reported_on_its_field()
    {
        var profile = MonsterProfile.Empty with { Skills = [new MonsterSkill(" ", null), new MonsterSkill("Spot Hidden", 2_001), new MonsterSkill("Stealth", 2_000)] };

        Assert.Equal(
            [
                Problem("skills[0].name", MonsterProfileProblemKind.SkillNameRequired),
                Problem("skills[0].value", MonsterProfileProblemKind.SkillValueOutOfRange),
                Problem("skills[1].value", MonsterProfileProblemKind.SkillValueOutOfRange),
            ],
            Check(profile));
    }

    [Fact]
    public void Given_a_spell_and_a_power_without_a_name_When_validated_Then_each_is_reported_on_its_row()
    {
        var profile = MonsterProfile.Empty with
        {
            Spells = [new MonsterSpell("Contact Deity", null, null), new MonsterSpell(" ", null, null)],
            Powers = [new MonsterPower(null, null, null, null)],
        };

        Assert.Equal(
            [
                Problem("spells[1].name", MonsterProfileProblemKind.SpellNameRequired),
                Problem("powers[0].name", MonsterProfileProblemKind.PowerNameRequired),
            ],
            Check(profile));
    }

    [Theory]
    [InlineData("1D6")]
    [InlineData("0/")]
    [InlineData("0/1D6+DB")]
    [InlineData("0 / 1D6")]
    public void Given_malformed_sanity_loss_When_validated_Then_it_is_reported_on_value(string value)
    {
        var profile = MonsterProfile.Empty with { SanityLoss = new MonsterSanityLoss(value) };

        Assert.Equal([Problem("sanityLoss.value", MonsterProfileProblemKind.SanityLossMalformed)], Check(profile));
    }

    [Fact]
    public void Given_sanity_loss_written_success_slash_failure_or_left_empty_When_validated_Then_it_is_accepted()
    {
        Assert.Empty(Check(MonsterProfile.Empty with { SanityLoss = new MonsterSanityLoss("0/1D6") }));
        Assert.Empty(Check(MonsterProfile.Empty with { SanityLoss = new MonsterSanityLoss(null) }));
    }

    [Fact]
    public void Given_101_rows_in_each_list_When_validated_Then_each_list_reports_too_many_rows()
    {
        var profile = MonsterProfile.Empty with
        {
            Movement = Enumerable.Repeat(new MonsterMovementMode("Walk", null, 8), 101).ToList(),
            Combat = new MonsterCombat(null, null, Enumerable.Repeat(MonsterProfileSamples.Attack(), 101).ToList()),
            Defenses = new MonsterDefenses(null, null, Enumerable.Repeat(new MonsterDefenseEntry("x"), 101).ToList(), Enumerable.Repeat(new MonsterDefenseEntry("x"), 101).ToList()),
            Skills = Enumerable.Repeat(new MonsterSkill("Spot Hidden", 50), 101).ToList(),
            Spells = Enumerable.Repeat(new MonsterSpell("Spell", null, null), 101).ToList(),
            Powers = Enumerable.Repeat(new MonsterPower("Power", null, null, null), 101).ToList(),
        };

        Assert.Equal(
            ["movement", "combat.attacks", "defenses.immunities", "defenses.vulnerabilities", "skills", "spells", "powers"],
            Check(profile).Select(problem => problem.Path));
        Assert.All(Check(profile), problem => Assert.Equal(MonsterProfileProblemKind.TooManyRows, problem.Kind));
    }

    [Fact]
    public void Given_100_rows_in_a_list_When_validated_Then_they_are_accepted()
    {
        var profile = MonsterProfile.Empty with { Skills = Enumerable.Repeat(new MonsterSkill("Spot Hidden", 50), 100).ToList() };

        Assert.Empty(Check(profile));
    }

    [Fact]
    public void Given_plain_text_of_4001_characters_When_validated_Then_each_field_reports_text_too_long()
    {
        var text = MonsterProfileSamples.LongText(4_001);
        var profile = MonsterProfile.Empty with
        {
            Details = new MonsterDetails(null, text, text, text, text, text, text),
            Defenses = new MonsterDefenses(null, text, [], []),
        };

        Assert.Equal(
            ["details.descriptionAndSensoryCues", "details.origin", "details.goalAndBehavior", "details.signsAndTraces", "details.defeatOutcome", "details.specimenRangeNotes", "defenses.armorNote"],
            Check(profile).Select(problem => problem.Path));
        Assert.All(Check(profile), problem => Assert.Equal(MonsterProfileProblemKind.TextTooLong, problem.Kind));
    }

    [Fact]
    public void Given_row_text_of_1001_characters_When_validated_Then_each_field_reports_row_text_too_long()
    {
        var text = MonsterProfileSamples.LongText(1_001);
        var profile = MonsterProfile.Empty with
        {
            Movement = [new MonsterMovementMode("Other", text, 8)],
            Combat = new MonsterCombat(null, null, [MonsterProfileSamples.Attack(name: text, skill: text, effect: text)]),
            Defenses = new MonsterDefenses(null, null, [new MonsterDefenseEntry(text)], [new MonsterDefenseEntry(text)]),
            Skills = [new MonsterSkill(text, 50)],
            Spells = [new MonsterSpell(text, text, text)],
            Powers = [new MonsterPower(text, text, text, text)],
        };

        var problems = Check(profile);

        Assert.All(problems, problem => Assert.Equal(MonsterProfileProblemKind.RowTextTooLong, problem.Kind));
        Assert.Contains("movement[0].label", problems.Select(problem => problem.Path));
        Assert.Contains("combat.attacks[0].effect", problems.Select(problem => problem.Path));
        Assert.Contains("defenses.vulnerabilities[0].description", problems.Select(problem => problem.Path));
        Assert.Contains("powers[0].limits", problems.Select(problem => problem.Path));
        Assert.Equal(14, problems.Count);
    }

    [Fact]
    public void Given_invalid_Keeper_notes_When_validated_Then_they_are_reported_on_keeper_notes()
    {
        var profile = MonsterProfile.Empty with { KeeperNotes = "{\"root\":{\"type\":\"nope\"}}" };

        Assert.Equal([Problem("keeperNotes", MonsterProfileProblemKind.KeeperNotesInvalid)], Check(profile));
    }

    [Fact]
    public void Given_problems_in_several_sections_When_validated_Then_all_are_reported_in_section_order()
    {
        var profile = MonsterProfileSamples.Ghoul() with
        {
            Characteristics = MonsterProfileSamples.Characteristics(("STR", 5_000)),
            SanityLoss = new MonsterSanityLoss("x"),
            Skills = [new MonsterSkill(null, 10)],
        };

        Assert.Equal(
            ["characteristics.values.STR", "skills[0].name", "sanityLoss.value"],
            Check(profile).Select(problem => problem.Path));
    }
}
