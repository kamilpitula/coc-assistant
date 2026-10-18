namespace CocAssistant.ScenarioPreparation.Domain;

internal static class NpcCombatValidation
{
    public static IEnumerable<NpcProfileProblem> Validate(NpcCombat? combat, IReadOnlyList<NpcSkill> skills)
    {
        if (combat is null)
        {
            return [];
        }

        return Dodge(combat.Dodge)
            .Concat(ArmorPoints(combat.ArmorPoints))
            .Concat(NpcProfileChecks.PlainText("combat.tacticsAndMorale", combat.TacticsAndMorale))
            .Concat(Weapons(combat.Weapons, skills));
    }

    private static IEnumerable<NpcProfileProblem> Dodge(int? dodge) =>
        dodge is null || NpcProfileChecks.InRange(dodge, 0, NpcProfileLimits.SkillValueMaximum)
            ? []
            : [new NpcProfileProblem("combat.dodge", NpcProfileProblemKind.DodgeOutOfRange)];

    private static IEnumerable<NpcProfileProblem> ArmorPoints(int? armorPoints) =>
        armorPoints is null || NpcProfileChecks.InRange(armorPoints, 0, NpcProfileLimits.ArmorPointsMaximum)
            ? []
            : [new NpcProfileProblem("combat.armorPoints", NpcProfileProblemKind.ArmorPointsOutOfRange)];

    private static IEnumerable<NpcProfileProblem> Weapons(IReadOnlyList<NpcWeapon> weapons, IReadOnlyList<NpcSkill> skills) =>
        weapons.Count > NpcProfileLimits.MaxRows
            ? NpcProfileChecks.TooManyRows("combat.weapons")
            : weapons.SelectMany((weapon, index) => Weapon(weapon, index, skills));

    private static IEnumerable<NpcProfileProblem> Weapon(NpcWeapon weapon, int index, IReadOnlyList<NpcSkill> skills)
    {
        string Path(string field) => NpcProfileChecks.Row("combat.weapons", index, field);
        var name = weapon.Name is null
            ? [new NpcProfileProblem(Path("name"), NpcProfileProblemKind.WeaponNameRequired)]
            : NpcProfileChecks.RowText(Path("name"), weapon.Name);
        var matched = MatchedSkill(weapon.Skill, skills);
        return name
            .Concat(matched is null ? [new NpcProfileProblem(Path("skill"), NpcProfileProblemKind.WeaponSkillNotOnProfile)] : [])
            .Concat(Damage(weapon.Damage, matched, Path("damage")))
            .Concat(AttacksPerRound(weapon.AttacksPerRound, Path("attacksPerRound")))
            .Concat(NpcProfileChecks.RowText(Path("range"), weapon.Range))
            .Concat(NpcProfileChecks.RowText(Path("ammunition"), weapon.Ammunition))
            .Concat(NpcProfileChecks.RowText(Path("malfunction"), weapon.Malfunction));
    }

    private static NpcSkill? MatchedSkill(NpcSkillReference? reference, IReadOnlyList<NpcSkill> skills) =>
        reference?.Name is null
            ? null
            : skills.FirstOrDefault(skill =>
                CombatSkillSpecializations.SameName(skill.Name, reference.Name)
                && CombatSkillSpecializations.SameName(skill.Specialization ?? string.Empty, reference.Specialization ?? string.Empty));

    private static IEnumerable<NpcProfileProblem> Damage(string? damage, NpcSkill? skill, string path)
    {
        if (damage is null)
        {
            return [new NpcProfileProblem(path, NpcProfileProblemKind.DamageRequired)];
        }

        if (damage.Length > NpcProfileLimits.RowTextMaxLength)
        {
            return NpcProfileChecks.RowText(path, damage);
        }

        var damageBonus = CombatSkillSpecializations.IsFirearms(skill?.Name) ? DamageBonusUse.Refused : DamageBonusUse.Allowed;
        if (DiceNotation.TryParse(damage, damageBonus, out _))
        {
            return [];
        }

        return DiceNotation.TryParse(damage, DamageBonusUse.Allowed, out _)
            ? [new NpcProfileProblem(path, NpcProfileProblemKind.DamageBonusOnFirearm)]
            : [new NpcProfileProblem(path, NpcProfileProblemKind.DamageMalformed)];
    }

    private static IEnumerable<NpcProfileProblem> AttacksPerRound(int? attacks, string path) =>
        NpcProfileChecks.InRange(attacks, NpcProfileLimits.AttacksPerRoundMinimum, NpcProfileLimits.AttacksPerRoundMaximum)
            ? []
            : [new NpcProfileProblem(path, NpcProfileProblemKind.AttacksPerRoundOutOfRange)];
}
