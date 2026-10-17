namespace CocAssistant.ScenarioPreparation.Domain;

internal static class NpcDetailsValidation
{
    public static IEnumerable<NpcProfileProblem> Validate(NpcDetails details) =>
        NpcProfileChecks.PlainText("details.professionOrRole", details.ProfessionOrRole)
            .Concat(NpcProfileChecks.PlainText("details.shortDescription", details.ShortDescription))
            .Concat(NpcProfileChecks.PlainText("details.goal", details.Goal))
            .Concat(NpcProfileChecks.PlainText("details.relationshipToInvestigators", details.RelationshipToInvestigators))
            .Concat(NpcProfileChecks.PlainText("details.knowledge", details.Knowledge))
            .Concat(NpcProfileChecks.PlainText("details.secrets", details.Secrets))
            .Concat(NpcProfileChecks.PlainText("details.behaviorCue", details.BehaviorCue));
}
