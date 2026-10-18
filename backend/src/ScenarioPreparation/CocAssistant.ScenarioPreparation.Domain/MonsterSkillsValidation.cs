namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterSkillsValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(IReadOnlyList<MonsterSkill>? skills) =>
        MonsterProfileChecks.Rows("skills", skills, Row);

    private static IEnumerable<MonsterProfileProblem> Row(MonsterSkill skill, int index) =>
        MonsterProfileChecks.RequiredRowText(ProfilePaths.Row("skills", index, "name"), skill.Name, MonsterProfileProblemKind.SkillNameRequired)
            .Concat(MonsterProfileChecks.RequiredInRange(
                ProfilePaths.Row("skills", index, "value"),
                skill.Value,
                0,
                MonsterProfileLimits.ValueMaximum,
                MonsterProfileProblemKind.SkillValueOutOfRange));
}
