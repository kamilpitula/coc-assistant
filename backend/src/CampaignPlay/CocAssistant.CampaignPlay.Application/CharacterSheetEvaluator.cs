namespace CocAssistant.CampaignPlay.Application;

/// <summary>
/// Computes and validates a Character Sheet against the creation rule data, the rule data of its Campaign's Era, and
/// the Campaign's allowed methods.
/// </summary>
public sealed class CharacterSheetEvaluator
{
    private readonly ICreationRuleData _creationRuleData;
    private readonly EraRuleDataLookup _eraRuleData;

    public CharacterSheetEvaluator(ICreationRuleData creationRuleData, IEnumerable<IEraRuleData> eraRuleData)
    {
        _creationRuleData = creationRuleData;
        _eraRuleData = new EraRuleDataLookup(eraRuleData);
    }

    public (CharacterSheetComputation Computation, IReadOnlyList<ValidationError> ValidationErrors) Evaluate(CharacterSheet sheet, Campaign campaign)
    {
        var rules = RulesFor(campaign.Era);
        var computation = new CharacterSheetCalculator(rules).Calculate(sheet);
        return (computation, CharacterSheetValidator.Validate(sheet, campaign.AllowedCreationMethods, computation, rules));
    }

    public CharacterSheetView View(Investigator investigator, Campaign campaign, string? playerName)
    {
        var (computation, errors) = Evaluate(investigator.CharacterSheet, campaign);
        return new CharacterSheetView(investigator, playerName, computation, errors);
    }

    private CreationRuleSet RulesFor(Era era)
    {
        var eraRuleData = _eraRuleData.For(era);
        return new CreationRuleSet(
            _creationRuleData.AgeRules,
            _creationRuleData.CharacteristicsRules,
            _creationRuleData.SkillSpecializations,
            eraRuleData.Occupations,
            eraRuleData.Skills,
            eraRuleData.Wealth);
    }
}

/// <summary>The Creation Methods this version can build a Character Sheet with (all three since PBI-CP-009).</summary>
public static class SupportedCreationMethods
{
    public static readonly IReadOnlyList<CreationMethod> All = [CreationMethod.StandardRolling, CreationMethod.PointBuy, CreationMethod.QuickFire];

    public static bool AnyAllowedBy(AllowedCreationMethods allowed) => All.Any(allowed.Allows);
}

/// <summary>Finds the registered rule data of an Era (ADR 0006: one IEraRuleData per Era).</summary>
public sealed class EraRuleDataLookup
{
    private readonly IReadOnlyList<IEraRuleData> _ruleDataByEra;

    public EraRuleDataLookup(IEnumerable<IEraRuleData> ruleDataByEra)
    {
        _ruleDataByEra = ruleDataByEra.ToList();
    }

    public IEraRuleData For(Era era) =>
        _ruleDataByEra.SingleOrDefault(ruleData => ruleData.Era == era)
        ?? throw new InvalidOperationException($"No rule data is registered for the {era} Era.");
}
