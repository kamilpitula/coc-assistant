namespace CocAssistant.ScenarioPreparation.Domain;

internal static class NpcSkillsValidation
{
    public static IEnumerable<NpcProfileProblem> Validate(IReadOnlyList<NpcSkill>? skills, CombatSkillSpecializations specializations)
    {
        if (skills is null)
        {
            return [];
        }

        return skills.Count > NpcProfileLimits.MaxRows
            ? NpcProfileChecks.TooManyRows("skills")
            : skills.SelectMany((skill, index) => Row(skill, index, specializations));
    }

    private static IEnumerable<NpcProfileProblem> Row(NpcSkill skill, int index, CombatSkillSpecializations specializations) =>
        Name(skill, index)
            .Concat(Specialization(skill, index, specializations))
            .Concat(Value(skill, index));

    private static IEnumerable<NpcProfileProblem> Name(NpcSkill skill, int index) =>
        skill.Name is null
            ? [new NpcProfileProblem(NpcProfileChecks.Row("skills", index, "name"), NpcProfileProblemKind.SkillNameRequired)]
            : NpcProfileChecks.RowText(NpcProfileChecks.Row("skills", index, "name"), skill.Name);

    private static IEnumerable<NpcProfileProblem> Specialization(NpcSkill skill, int index, CombatSkillSpecializations specializations)
    {
        var path = NpcProfileChecks.Row("skills", index, "specialization");
        var family = specializations.FamilyOf(skill.Name);
        if (family is null)
        {
            return NpcProfileChecks.RowText(path, skill.Specialization);
        }

        return specializations.Lists(family, skill.Specialization)
            ? []
            : [new NpcProfileProblem(path, NpcProfileProblemKind.SpecializationNotListed, family)];
    }

    private static IEnumerable<NpcProfileProblem> Value(NpcSkill skill, int index) =>
        NpcProfileChecks.InRange(skill.Value, 0, NpcProfileLimits.SkillValueMaximum)
            ? []
            : [new NpcProfileProblem(NpcProfileChecks.Row("skills", index, "value"), NpcProfileProblemKind.SkillValueOutOfRange)];
}
