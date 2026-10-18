namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterCombatValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(MonsterCombat? combat)
    {
        if (combat is null)
        {
            return [];
        }

        return MonsterProfileChecks.OptionalInRange(
                "combat.attacksPerRound",
                combat.AttacksPerRound,
                ProfileLimits.AttacksPerRoundMinimum,
                ProfileLimits.AttacksPerRoundMaximum,
                MonsterProfileProblemKind.AttacksPerRoundOutOfRange)
            .Concat(MonsterProfileChecks.OptionalInRange(
                "combat.dodge",
                combat.Dodge,
                0,
                MonsterProfileLimits.ValueMaximum,
                MonsterProfileProblemKind.DodgeOutOfRange))
            .Concat(MonsterProfileChecks.Rows("combat.attacks", combat.Attacks, Attack));
    }

    private static IEnumerable<MonsterProfileProblem> Attack(MonsterAttack attack, int index)
    {
        string Path(string field) => ProfilePaths.Row("combat.attacks", index, field);
        return MonsterProfileChecks.RequiredRowText(Path("name"), attack.Name, MonsterProfileProblemKind.AttackNameRequired)
            .Concat(MonsterProfileChecks.RequiredRowText(Path("skill"), attack.Skill, MonsterProfileProblemKind.AttackSkillRequired))
            .Concat(MonsterProfileChecks.RequiredInRange(
                Path("skillValue"),
                attack.SkillValue,
                0,
                MonsterProfileLimits.ValueMaximum,
                MonsterProfileProblemKind.AttackSkillValueOutOfRange))
            .Concat(Damage(attack, Path("damage")))
            .Concat(MonsterProfileChecks.RowText(Path("effect"), attack.Effect));
    }

    private static IEnumerable<MonsterProfileProblem> Damage(MonsterAttack attack, string path)
    {
        if (attack.Damage is null)
        {
            return attack.Manoeuvre ? [] : [new MonsterProfileProblem(path, MonsterProfileProblemKind.AttackDamageRequired)];
        }

        if (attack.Damage.Length > ProfileLimits.RowTextMaxLength)
        {
            return MonsterProfileChecks.RowText(path, attack.Damage);
        }

        var damageBonus = MonsterAttackSkills.IsFirearms(attack.Skill) ? DamageBonusUse.Refused : DamageBonusUse.Allowed;
        if (DiceNotation.TryParse(attack.Damage, damageBonus, out _))
        {
            return [];
        }

        return DiceNotation.TryParse(attack.Damage, DamageBonusUse.Allowed, out _)
            ? [new MonsterProfileProblem(path, MonsterProfileProblemKind.DamageBonusOnFirearm)]
            : [new MonsterProfileProblem(path, MonsterProfileProblemKind.DamageMalformed)];
    }
}

/// <summary>An attack's skill family (docs/game-rules/project_ruleset.md sections 5.5 and 5.9).</summary>
internal static class MonsterAttackSkills
{
    /// <summary>True when the skill text before any parenthesis, trimmed, is Firearms, ignoring case.</summary>
    public static bool IsFirearms(string? skill)
    {
        if (skill is null)
        {
            return false;
        }

        var parenthesis = skill.IndexOf('(', StringComparison.Ordinal);
        var family = (parenthesis < 0 ? skill : skill[..parenthesis]).Trim();
        return CombatSkillSpecializations.IsFirearms(family);
    }
}
