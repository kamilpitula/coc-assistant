namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Computes and validates a Character Sheet against the creation rule data, the rule data of its Campaign's Era, and
/// the Campaign's allowed methods.
/// </summary>
public sealed class CharacterSheetEvaluator
{
    private readonly CreationRuleSets _ruleSets;

    public CharacterSheetEvaluator(CreationRuleSets ruleSets)
    {
        _ruleSets = ruleSets;
    }

    public (CharacterSheetComputation Computation, IReadOnlyList<ValidationError> ValidationErrors) Evaluate(CharacterSheet sheet, Campaign campaign)
    {
        var rules = _ruleSets.For(campaign.Era);
        var computation = new CharacterSheetCalculator(rules).Calculate(sheet);
        return (computation, CharacterSheetValidator.Validate(sheet, campaign.AllowedCreationMethods, computation, rules));
    }

    public CharacterSheetView View(Investigator investigator, Campaign campaign, string? playerName)
    {
        var (computation, errors) = Evaluate(investigator.CharacterSheet, campaign);
        return new CharacterSheetView(investigator, playerName, computation, errors);
    }
}

/// <summary>The Creation Methods this version can build a Character Sheet with (all three since PBI-CP-009).</summary>
public static class SupportedCreationMethods
{
    public static readonly IReadOnlyList<CreationMethod> All = [CreationMethod.StandardRolling, CreationMethod.PointBuy, CreationMethod.QuickFire];

    public static bool AnyAllowedBy(AllowedCreationMethods allowed) => All.Any(allowed.Allows);
}

/// <summary>
/// Builds the rule set of an Era from the creation rule data and the Era's registered rule data (ADR 0006: one
/// IEraRuleData per Era).
/// </summary>
public sealed class CreationRuleSets
{
    private readonly ICreationRuleData _creationRuleData;
    private readonly IReadOnlyList<IEraRuleData> _ruleDataByEra;

    public CreationRuleSets(ICreationRuleData creationRuleData, IEnumerable<IEraRuleData> ruleDataByEra)
    {
        _creationRuleData = creationRuleData;
        _ruleDataByEra = ruleDataByEra.ToList();
    }

    public IEraRuleData EraRuleDataFor(Era era) =>
        _ruleDataByEra.SingleOrDefault(ruleData => ruleData.Era == era)
        ?? throw new InvalidOperationException($"No rule data is registered for the {era} Era.");

    public CreationRuleSet For(Era era)
    {
        var eraRuleData = EraRuleDataFor(era);
        return new CreationRuleSet(
            _creationRuleData.AgeRules,
            _creationRuleData.CharacteristicsRules,
            _creationRuleData.SkillSpecializations,
            eraRuleData.Occupations,
            eraRuleData.Skills,
            eraRuleData.Wealth);
    }
}
