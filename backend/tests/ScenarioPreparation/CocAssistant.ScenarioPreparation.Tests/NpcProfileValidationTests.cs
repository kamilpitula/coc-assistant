namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// The structural problems that block saving an NPC Profile, each reported on its request path
/// (docs/game-rules/project_ruleset.md sections 5.2, 5.5, 5.7, 5.8; ADR 0018).
/// </summary>
public class NpcProfileValidationTests
{
    private static IReadOnlyList<NpcProfileProblem> Check(NpcProfile profile) =>
        NpcProfileValidation.Validate("Mr. Knott", profile, NpcProfileSamples.Specializations);

    private static NpcProfile WithSkills(params NpcSkill[] skills) => NpcProfileSamples.Narrative() with { Skills = skills };

    private static NpcProfile WithWeapon(NpcWeapon weapon, params NpcSkill[] skills) =>
        NpcProfileSamples.Narrative() with { Skills = skills, Combat = NpcProfileSamples.Combat(weapon) };

    private static readonly NpcSkill Handgun = NpcProfileSamples.Skill("Firearms", 60, "Handgun");
    private static readonly NpcSkill Brawl = NpcProfileSamples.Skill("Fighting", 60, "Brawl");

    [Fact]
    public void Given_a_complete_valid_profile_When_validated_Then_there_are_no_problems()
    {
        var profile = NpcProfileSamples.Thug() with
        {
            Skills = [Handgun, Brawl, NpcProfileSamples.Skill("Spot Hidden", 55), NpcProfileSamples.Skill("Occult (Custom)", 10)],
            Combat = NpcProfileSamples.Combat(NpcProfileSamples.Weapon(damage: "1D10")),
            Spells = [NpcProfileSamples.Spell()],
            KeeperNotes = NpcProfileSamples.ValidKeeperNotes,
        };

        Assert.Empty(Check(profile));
    }

    [Theory]
    [InlineData(101)]
    [InlineData(-1)]
    public void Given_a_characteristic_outside_0_to_100_When_validated_Then_it_is_reported_on_its_code(int value)
    {
        var profile = NpcProfileSamples.Narrative() with { Characteristics = NpcProfileSamples.Characteristics(("STR", value)) };

        Assert.Equal([new NpcProfileProblem("characteristics.STR", NpcProfileProblemKind.CharacteristicOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_characteristics_at_0_and_100_When_validated_Then_they_are_accepted()
    {
        var profile = NpcProfileSamples.Narrative() with { Characteristics = NpcProfileSamples.Characteristics(("STR", 0), ("CON", 100)) };

        Assert.Empty(Check(profile));
    }

    [Fact]
    public void Given_an_unknown_characteristic_code_When_validated_Then_it_is_reported_on_that_code()
    {
        var profile = NpcProfileSamples.Narrative() with { Characteristics = NpcProfileSamples.Characteristics(("LUCK", 50)) };

        Assert.Equal([new NpcProfileProblem("characteristics.LUCK", NpcProfileProblemKind.UnknownCharacteristic)], Check(profile));
    }

    [Fact]
    public void Given_a_skill_without_a_name_When_validated_Then_it_is_reported_on_that_row()
    {
        var problems = Check(WithSkills(NpcProfileSamples.Skill("Spot Hidden"), NpcProfileSamples.Skill("  ")));

        Assert.Equal([new NpcProfileProblem("skills[1].name", NpcProfileProblemKind.SkillNameRequired)], problems);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(101)]
    [InlineData(-5)]
    public void Given_a_skill_without_a_valid_value_When_validated_Then_it_is_reported_on_value(int? value)
    {
        var problems = Check(WithSkills(NpcProfileSamples.Skill("Spot Hidden", value)));

        Assert.Equal([new NpcProfileProblem("skills[0].value", NpcProfileProblemKind.SkillValueOutOfRange)], problems);
    }

    [Theory]
    [InlineData("Fighting", null, "Fighting")]
    [InlineData("Fighting", "Laser", "Fighting")]
    [InlineData("fighting", "Handgun", "Fighting")]
    [InlineData("Firearms", "Brawl", "Firearms")]
    [InlineData("FIREARMS", null, "Firearms")]
    public void Given_a_fighting_or_firearms_skill_with_an_unlisted_specialization_When_validated_Then_it_is_reported_with_the_family(string name, string? specialization, string family)
    {
        var problems = Check(WithSkills(NpcProfileSamples.Skill(name, 40, specialization)));

        Assert.Equal([new NpcProfileProblem("skills[0].specialization", NpcProfileProblemKind.SpecializationNotListed, family)], problems);
    }

    [Theory]
    [InlineData("fighting", "brawl")]
    [InlineData("Firearms", "rifle/shotgun")]
    public void Given_a_listed_specialization_in_any_letter_case_When_validated_Then_it_is_accepted(string name, string specialization)
    {
        Assert.Empty(Check(WithSkills(NpcProfileSamples.Skill(name, 40, specialization))));
    }

    [Fact]
    public void Given_a_custom_skill_with_a_specialization_When_validated_Then_it_is_accepted()
    {
        Assert.Empty(Check(WithSkills(NpcProfileSamples.Skill("Language (Other)", 40, "Welsh"))));
    }

    [Theory]
    [InlineData(101)]
    [InlineData(-1)]
    public void Given_a_dodge_outside_0_to_100_When_validated_Then_it_is_reported(int dodge)
    {
        var profile = NpcProfileSamples.Narrative() with { Combat = NpcProfileSamples.Combat() with { Dodge = dodge } };

        Assert.Equal([new NpcProfileProblem("combat.dodge", NpcProfileProblemKind.DodgeOutOfRange)], Check(profile));
    }

    [Theory]
    [InlineData(2001)]
    [InlineData(-1)]
    public void Given_armor_points_outside_0_to_2000_When_validated_Then_they_are_reported(int armor)
    {
        var profile = NpcProfileSamples.Narrative() with { Combat = NpcProfileSamples.Combat() with { ArmorPoints = armor } };

        Assert.Equal([new NpcProfileProblem("combat.armorPoints", NpcProfileProblemKind.ArmorPointsOutOfRange)], Check(profile));
    }

    [Fact]
    public void Given_armor_points_at_2000_and_dodge_at_100_When_validated_Then_they_are_accepted()
    {
        var profile = NpcProfileSamples.Narrative() with { Combat = NpcProfileSamples.Combat() with { Dodge = 100, ArmorPoints = 2000 } };

        Assert.Empty(Check(profile));
    }

    [Fact]
    public void Given_a_weapon_without_a_name_When_validated_Then_it_is_reported_on_that_weapon()
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(name: " "), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].name", NpcProfileProblemKind.WeaponNameRequired)], problems);
    }

    [Fact]
    public void Given_a_weapon_without_a_skill_When_validated_Then_it_is_reported_on_skill()
    {
        var weapon = NpcProfileSamples.Weapon() with { Skill = null };

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].skill", NpcProfileProblemKind.WeaponSkillNotOnProfile)], Check(WithWeapon(weapon, Handgun)));
    }

    [Fact]
    public void Given_a_weapon_whose_skill_is_not_on_the_profile_When_validated_Then_it_is_reported_on_skill()
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(), Brawl));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].skill", NpcProfileProblemKind.WeaponSkillNotOnProfile)], problems);
    }

    [Fact]
    public void Given_a_weapon_skill_matching_a_profile_skill_in_another_letter_case_When_validated_Then_it_is_accepted()
    {
        var weapon = NpcProfileSamples.Weapon(skillName: "firearms", skillSpecialization: "HANDGUN");

        Assert.Empty(Check(WithWeapon(weapon, Handgun)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_a_weapon_without_damage_When_validated_Then_it_is_reported_on_damage(string? damage)
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(damage: damage), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].damage", NpcProfileProblemKind.DamageRequired)], problems);
    }

    [Theory]
    [InlineData("D")]
    [InlineData("1D")]
    [InlineData("0D6")]
    [InlineData("1D0")]
    [InlineData("1D6 + 2")]
    [InlineData("++1")]
    public void Given_malformed_damage_When_validated_Then_it_is_reported_on_damage(string damage)
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(damage: damage), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].damage", NpcProfileProblemKind.DamageMalformed)], problems);
    }

    [Fact]
    public void Given_damage_bonus_on_a_firearms_weapon_When_validated_Then_it_is_refused()
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(damage: "1D10+DB"), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].damage", NpcProfileProblemKind.DamageBonusOnFirearm)], problems);
    }

    [Fact]
    public void Given_damage_bonus_on_a_fighting_weapon_When_validated_Then_it_is_accepted()
    {
        var weapon = NpcProfileSamples.Weapon(name: "Fists", skillName: "Fighting", skillSpecialization: "Brawl", damage: "1D3+DB");

        Assert.Empty(Check(WithWeapon(weapon, Brawl)));
    }

    [Fact]
    public void Given_damage_bonus_on_a_weapon_whose_skill_is_unknown_When_validated_Then_only_the_skill_is_reported()
    {
        var weapon = NpcProfileSamples.Weapon(damage: "1D10+DB");

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].skill", NpcProfileProblemKind.WeaponSkillNotOnProfile)], Check(WithWeapon(weapon, Brawl)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(null)]
    public void Given_attacks_per_round_outside_1_to_99_When_validated_Then_they_are_reported(int? attacks)
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(attacks: attacks), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].attacksPerRound", NpcProfileProblemKind.AttacksPerRoundOutOfRange)], problems);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(99)]
    public void Given_attacks_per_round_at_the_edges_When_validated_Then_they_are_accepted(int attacks)
    {
        Assert.Empty(Check(WithWeapon(NpcProfileSamples.Weapon(attacks: attacks), Handgun)));
    }

    [Fact]
    public void Given_a_spell_without_a_name_When_validated_Then_it_is_reported_on_that_spell()
    {
        var profile = NpcProfileSamples.Narrative() with { Spells = [NpcProfileSamples.Spell(), NpcProfileSamples.Spell(name: "")] };

        Assert.Equal([new NpcProfileProblem("spells[1].name", NpcProfileProblemKind.SpellNameRequired)], Check(profile));
    }

    [Fact]
    public void Given_101_skills_When_validated_Then_the_list_is_reported_and_100_are_accepted()
    {
        var hundred = Enumerable.Range(0, 100).Select(index => NpcProfileSamples.Skill($"Skill {index}")).ToArray();
        var tooMany = hundred.Append(NpcProfileSamples.Skill("One more")).ToArray();

        Assert.Empty(Check(WithSkills(hundred)));
        Assert.Equal([new NpcProfileProblem("skills", NpcProfileProblemKind.TooManyRows)], Check(WithSkills(tooMany)));
    }

    [Fact]
    public void Given_101_weapons_or_spells_When_validated_Then_each_list_is_reported()
    {
        var weapons = Enumerable.Range(0, 101).Select(_ => NpcProfileSamples.Weapon()).ToArray();
        var spells = Enumerable.Range(0, 101).Select(_ => NpcProfileSamples.Spell()).ToArray();
        var profile = NpcProfileSamples.Narrative() with
        {
            Skills = [Handgun],
            Combat = new NpcCombat(null, null, null, weapons),
            Spells = spells,
        };

        Assert.Equal(
            [
                new NpcProfileProblem("combat.weapons", NpcProfileProblemKind.TooManyRows),
                new NpcProfileProblem("spells", NpcProfileProblemKind.TooManyRows),
            ],
            Check(profile));
    }

    [Fact]
    public void Given_details_text_of_4001_characters_When_validated_Then_it_is_reported_and_4000_is_accepted()
    {
        var tooLong = NpcDetails.Empty with { Goal = NpcProfileSamples.LongText(4001) };
        var longest = NpcDetails.Empty with { Goal = NpcProfileSamples.LongText(4000) };

        Assert.Equal([new NpcProfileProblem("details.goal", NpcProfileProblemKind.TextTooLong)], Check(NpcProfileSamples.Narrative() with { Details = tooLong }));
        Assert.Empty(Check(NpcProfileSamples.Narrative() with { Details = longest }));
    }

    [Fact]
    public void Given_tactics_and_morale_of_4001_characters_When_validated_Then_it_is_reported()
    {
        var profile = NpcProfileSamples.Narrative() with { Combat = NpcProfileSamples.Combat() with { TacticsAndMorale = NpcProfileSamples.LongText(4001) } };

        Assert.Equal([new NpcProfileProblem("combat.tacticsAndMorale", NpcProfileProblemKind.TextTooLong)], Check(profile));
    }

    [Fact]
    public void Given_row_text_of_1001_characters_When_validated_Then_each_field_is_reported_and_1000_is_accepted()
    {
        var weapon = NpcProfileSamples.Weapon(name: NpcProfileSamples.LongText(1001)) with
        {
            Range = NpcProfileSamples.LongText(1001),
            Ammunition = NpcProfileSamples.LongText(1001),
            Malfunction = NpcProfileSamples.LongText(1001),
        };
        var profile = WithWeapon(weapon, Handgun) with
        {
            Spells = [NpcProfileSamples.Spell(name: NpcProfileSamples.LongText(1001), cost: NpcProfileSamples.LongText(1001), effect: NpcProfileSamples.LongText(1001))],
        };
        var skill = NpcProfileSamples.Skill(NpcProfileSamples.LongText(1001), 50, NpcProfileSamples.LongText(1001));

        Assert.Equal(
            [
                "combat.weapons[0].name",
                "combat.weapons[0].range",
                "combat.weapons[0].ammunition",
                "combat.weapons[0].malfunction",
                "spells[0].name",
                "spells[0].magicPointCost",
                "spells[0].effect",
            ],
            Check(profile).Select(problem => problem.Path));
        Assert.Equal(["skills[0].name", "skills[0].specialization"], Check(WithSkills(skill)).Select(problem => problem.Path));
        Assert.All(Check(profile), problem => Assert.Equal(NpcProfileProblemKind.RowTextTooLong, problem.Kind));
        Assert.Empty(Check(WithSkills(NpcProfileSamples.Skill(NpcProfileSamples.LongText(1000), 50, null))));
    }

    [Fact]
    public void Given_damage_of_1001_characters_When_validated_Then_it_is_reported_as_too_long()
    {
        var problems = Check(WithWeapon(NpcProfileSamples.Weapon(damage: NpcProfileSamples.LongText(1001)), Handgun));

        Assert.Equal([new NpcProfileProblem("combat.weapons[0].damage", NpcProfileProblemKind.RowTextTooLong)], problems);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}")]
    public void Given_invalid_Keeper_notes_When_validated_Then_they_are_reported_on_keeperNotes(string notes)
    {
        var profile = NpcProfileSamples.Narrative() with { KeeperNotes = notes };

        Assert.Equal([new NpcProfileProblem("keeperNotes", NpcProfileProblemKind.KeeperNotesInvalid)], Check(profile));
    }

    [Fact]
    public void Given_several_problems_When_validated_Then_all_are_reported_in_section_order()
    {
        var profile = NpcProfileSamples.Narrative(200) with
        {
            Characteristics = NpcProfileSamples.Characteristics(("STR", 101)),
            Skills = [NpcProfileSamples.Skill(" ", null)],
            Spells = [NpcProfileSamples.Spell(name: "")],
        };

        var problems = NpcProfileValidation.Validate(string.Empty, profile, NpcProfileSamples.Specializations);

        Assert.Equal(
            ["name", "age", "characteristics.STR", "skills[0].name", "skills[0].value", "spells[0].name"],
            problems.Select(problem => problem.Path));
    }
}
