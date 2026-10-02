namespace CocAssistant.CampaignPlay.Domain.CharacterSheets;

/// <summary>The result of one EDU improvement check (section 3.2). <c>Improves</c> is true when the roll is above EDU.</summary>
public sealed record EduImprovementOutcome(int Number, int? Check, int? Gain, int EduBefore, int EduAfter, bool Improves);

/// <summary>EDU improvement checks: docs/game-rules/coc7_character_creation_and_development_rules.md section 3.2.</summary>
public static class EduImprovement
{
    private const int MaximumEducation = 99;

    /// <summary>Runs the checks in order, each against EDU after the earlier gains; a missing roll or gain changes nothing.</summary>
    public static IReadOnlyList<EduImprovementOutcome> Evaluate(int startingEducation, IReadOnlyList<EduImprovementCheckInput> checks)
    {
        var outcomes = new List<EduImprovementOutcome>();
        var education = startingEducation;
        foreach (var (check, index) in checks.Select((check, index) => (check, index)))
        {
            var improves = check.Check > education;
            var after = improves && check.Gain is not null ? Math.Min(MaximumEducation, education + check.Gain.Value) : education;
            outcomes.Add(new EduImprovementOutcome(index + 1, check.Check, check.Gain, education, after, improves));
            education = after;
        }

        return outcomes;
    }
}
