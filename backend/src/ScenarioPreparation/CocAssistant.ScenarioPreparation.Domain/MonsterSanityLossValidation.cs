namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterSanityLossValidation
{
    private const string Path = "sanityLoss.value";

    public static IEnumerable<MonsterProfileProblem> Validate(MonsterSanityLoss? sanityLoss)
    {
        if (sanityLoss?.Value is not { } value)
        {
            return [];
        }

        if (value.Length > ProfileLimits.RowTextMaxLength)
        {
            return MonsterProfileChecks.RowText(Path, value);
        }

        return SanityLossNotation.TryParse(value, out _)
            ? []
            : [new MonsterProfileProblem(Path, MonsterProfileProblemKind.SanityLossMalformed)];
    }
}
