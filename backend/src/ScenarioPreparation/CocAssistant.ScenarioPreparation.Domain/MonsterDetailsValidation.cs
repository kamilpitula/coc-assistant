namespace CocAssistant.ScenarioPreparation.Domain;

internal static class MonsterDetailsValidation
{
    public static IEnumerable<MonsterProfileProblem> Validate(MonsterDetails details) =>
        CreatureKindListed(details.CreatureKind)
            .Concat(MonsterProfileChecks.PlainText("details.descriptionAndSensoryCues", details.DescriptionAndSensoryCues))
            .Concat(MonsterProfileChecks.PlainText("details.origin", details.Origin))
            .Concat(MonsterProfileChecks.PlainText("details.goalAndBehavior", details.GoalAndBehavior))
            .Concat(MonsterProfileChecks.PlainText("details.signsAndTraces", details.SignsAndTraces))
            .Concat(MonsterProfileChecks.PlainText("details.defeatOutcome", details.DefeatOutcome))
            .Concat(MonsterProfileChecks.PlainText("details.specimenRangeNotes", details.SpecimenRangeNotes));

    private static IEnumerable<MonsterProfileProblem> CreatureKindListed(string? creatureKind) =>
        creatureKind is null || EnumNames.Canonical<CreatureKind>(creatureKind) is not null
            ? []
            : [new MonsterProfileProblem("details.creatureKind", MonsterProfileProblemKind.CreatureKindNotListed)];
}
