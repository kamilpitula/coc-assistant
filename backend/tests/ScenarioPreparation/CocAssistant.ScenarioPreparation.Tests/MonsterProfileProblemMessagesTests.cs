namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The copy of each Monster Profile problem (specs/scenario-preparation/ux.md section 25.5; ADR 0018).</summary>
public class MonsterProfileProblemMessagesTests
{
    public static TheoryData<MonsterProfileProblemKind> Kinds()
    {
        var kinds = new TheoryData<MonsterProfileProblemKind>();
        foreach (var kind in Enum.GetValues<MonsterProfileProblemKind>())
        {
            kinds.Add(kind);
        }

        return kinds;
    }

    [Theory]
    [MemberData(nameof(Kinds))]
    public void Given_any_problem_kind_When_its_message_is_found_Then_there_is_one(MonsterProfileProblemKind kind)
    {
        var message = MonsterProfileProblemMessages.For(new MonsterProfileProblem("skills[0].name", kind));

        Assert.False(string.IsNullOrWhiteSpace(message));
    }

    [Theory]
    [InlineData("name", MonsterProfileProblemKind.NameRequired, "Enter a name.")]
    [InlineData("name", MonsterProfileProblemKind.NameTooLong, "Name must be 200 characters or fewer.")]
    [InlineData("details.creatureKind", MonsterProfileProblemKind.CreatureKindNotListed, "Choose a Creature Kind from the list.")]
    [InlineData("details.origin", MonsterProfileProblemKind.TextTooLong, "Origin must be 4,000 characters or fewer.")]
    [InlineData("details.goalAndBehavior", MonsterProfileProblemKind.TextTooLong, "Goal and typical behavior must be 4,000 characters or fewer.")]
    [InlineData("defenses.armorNote", MonsterProfileProblemKind.TextTooLong, "Armor note must be 4,000 characters or fewer.")]
    [InlineData("combat.attacks[2].effect", MonsterProfileProblemKind.RowTextTooLong, "Effect must be 1,000 characters or fewer.")]
    [InlineData("powers[0].limits", MonsterProfileProblemKind.RowTextTooLong, "Limits must be 1,000 characters or fewer.")]
    [InlineData("characteristics.overrides.damageBonus.value", MonsterProfileProblemKind.RowTextTooLong, "Damage Bonus must be 1,000 characters or fewer.")]
    [InlineData("movement", MonsterProfileProblemKind.TooManyRows, "Add at most 100 movement modes.")]
    [InlineData("combat.attacks", MonsterProfileProblemKind.TooManyRows, "Add at most 100 attacks.")]
    [InlineData("defenses.immunities", MonsterProfileProblemKind.TooManyRows, "Add at most 100 immunities.")]
    [InlineData("powers", MonsterProfileProblemKind.TooManyRows, "Add at most 100 powers.")]
    [InlineData("characteristics.values.LUCK", MonsterProfileProblemKind.UnknownCharacteristic, "LUCK isn't a characteristic.")]
    [InlineData("characteristics.values.STR", MonsterProfileProblemKind.CharacteristicOutOfRange, "Enter STR from 0 to 2,000.")]
    [InlineData("characteristics.overrides.hitPoints.value", MonsterProfileProblemKind.OverrideValueRequired, "Enter the override.")]
    [InlineData("characteristics.overrides.hitPoints.value", MonsterProfileProblemKind.HitPointsOverrideOutOfRange, "Enter Hit Points from 1 to 9,999.")]
    [InlineData("characteristics.overrides.magicPoints.value", MonsterProfileProblemKind.MagicPointsOverrideOutOfRange, "Enter Magic Points from 0 to 9,999.")]
    [InlineData("characteristics.overrides.build.value", MonsterProfileProblemKind.BuildOverrideOutOfRange, "Enter Build from -2 to 99.")]
    [InlineData("characteristics.overrides.damageBonus.value", MonsterProfileProblemKind.DamageBonusOverrideMalformed, "Write the Damage Bonus like +1D4, -1, or 0.")]
    [InlineData("characteristics.overrides.hitPoints.reason", MonsterProfileProblemKind.OverrideReasonRequired, "Give a reason for the override.")]
    [InlineData("characteristics.overrides.hitPoints.reason", MonsterProfileProblemKind.OverrideReasonTooLong, "Reason must be 500 characters or fewer.")]
    [InlineData("characteristics.hitPointsNotApplicable", MonsterProfileProblemKind.HitPointsOverriddenAndNotApplicable, "Choose either an override or not applicable for Hit Points.")]
    [InlineData("details.defeatOutcome", MonsterProfileProblemKind.DefeatOutcomeRequired, "Describe the defeat outcome, because Hit Points don't apply.")]
    [InlineData("movement[0].mode", MonsterProfileProblemKind.MovementModeNotListed, "Choose a mode from the list.")]
    [InlineData("movement[0].label", MonsterProfileProblemKind.MovementLabelRequired, "Name the mode.")]
    [InlineData("movement[0].rate", MonsterProfileProblemKind.MovementRateOutOfRange, "Enter a rate from 0 to 999.")]
    [InlineData("combat.attacksPerRound", MonsterProfileProblemKind.AttacksPerRoundOutOfRange, "Enter attacks per round from 1 to 99.")]
    [InlineData("combat.dodge", MonsterProfileProblemKind.DodgeOutOfRange, "Enter Dodge from 0 to 2,000.")]
    [InlineData("defenses.armorPoints", MonsterProfileProblemKind.ArmorPointsOutOfRange, "Enter armor points from 0 to 2,000.")]
    [InlineData("combat.attacks[0].name", MonsterProfileProblemKind.AttackNameRequired, "Enter the attack's name.")]
    [InlineData("combat.attacks[0].skill", MonsterProfileProblemKind.AttackSkillRequired, "Enter the attack's skill.")]
    [InlineData("combat.attacks[0].skillValue", MonsterProfileProblemKind.AttackSkillValueOutOfRange, "Enter a skill value from 0 to 2,000.")]
    [InlineData("combat.attacks[0].damage", MonsterProfileProblemKind.AttackDamageRequired, "Enter the damage, or mark the attack as a manoeuvre.")]
    [InlineData("combat.attacks[0].damage", MonsterProfileProblemKind.DamageMalformed, "Write the damage as dice and numbers, for example 1D6+DB or 2D6-1.")]
    [InlineData("combat.attacks[0].damage", MonsterProfileProblemKind.DamageBonusOnFirearm, "Damage Bonus doesn't apply to firearms. Remove DB from the damage.")]
    [InlineData("defenses.immunities[0].description", MonsterProfileProblemKind.ImmunityDescriptionRequired, "Describe the immunity.")]
    [InlineData("defenses.vulnerabilities[0].description", MonsterProfileProblemKind.VulnerabilityDescriptionRequired, "Describe the vulnerability.")]
    [InlineData("skills[0].name", MonsterProfileProblemKind.SkillNameRequired, "Enter the skill's name.")]
    [InlineData("skills[0].value", MonsterProfileProblemKind.SkillValueOutOfRange, "Enter a value from 0 to 2,000.")]
    [InlineData("spells[0].name", MonsterProfileProblemKind.SpellNameRequired, "Enter the spell's name.")]
    [InlineData("powers[0].name", MonsterProfileProblemKind.PowerNameRequired, "Enter the power's name.")]
    [InlineData("sanityLoss.value", MonsterProfileProblemKind.SanityLossMalformed, "Write the Sanity loss as success/failure, for example 0/1D6.")]
    public void Given_a_problem_When_its_message_is_found_Then_it_names_the_field_and_limit(string path, MonsterProfileProblemKind kind, string expected)
    {
        Assert.Equal(expected, MonsterProfileProblemMessages.For(new MonsterProfileProblem(path, kind)));
    }
}
