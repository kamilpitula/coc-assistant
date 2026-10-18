namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterDefensesValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(MonsterDefenses? defenses)
    {
        if (defenses is null)
        {
            return [];
        }

        return MonsterProfileChecks.OptionalInRange(
                "defenses.armorPoints",
                defenses.ArmorPoints,
                0,
                ProfileLimits.ArmorPointsMaximum,
                MonsterProfileProblemKind.ArmorPointsOutOfRange)
            .Concat(MonsterProfileChecks.PlainText("defenses.armorNote", defenses.ArmorNote))
            .Concat(MonsterProfileChecks.Rows(
                "defenses.immunities",
                defenses.Immunities,
                (entry, index) => Entry("defenses.immunities", entry, index, MonsterProfileProblemKind.ImmunityDescriptionRequired)))
            .Concat(MonsterProfileChecks.Rows(
                "defenses.vulnerabilities",
                defenses.Vulnerabilities,
                (entry, index) => Entry("defenses.vulnerabilities", entry, index, MonsterProfileProblemKind.VulnerabilityDescriptionRequired)));
    }

    private static IEnumerable<MonsterProfileProblem> Entry(string list, MonsterDefenseEntry entry, int index, MonsterProfileProblemKind required) =>
        MonsterProfileChecks.RequiredRowText(ProfilePaths.Row(list, index, "description"), entry.Description, required);
}
