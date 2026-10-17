namespace CocAssistant.ScenarioPreparation.Domain;

internal static class NpcCharacteristicsValidation
{
    public static IEnumerable<NpcProfileProblem> Validate(NpcCharacteristics? characteristics) =>
        characteristics is null ? [] : characteristics.Values.SelectMany(entry => Check(entry.Key, entry.Value));

    private static IEnumerable<NpcProfileProblem> Check(string code, int? value)
    {
        var path = $"characteristics.{code}";
        if (!CharacteristicCodes.TryParse(code, out _))
        {
            return [new NpcProfileProblem(path, NpcProfileProblemKind.UnknownCharacteristic)];
        }

        return value is null || NpcProfileChecks.InRange(value, 0, NpcProfileLimits.SkillValueMaximum)
            ? []
            : [new NpcProfileProblem(path, NpcProfileProblemKind.CharacteristicOutOfRange)];
    }
}
