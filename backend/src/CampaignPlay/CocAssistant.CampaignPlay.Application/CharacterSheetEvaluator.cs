namespace CocAssistant.CampaignPlay.Application;

/// <summary>Computes and validates a Character Sheet against the creation rule data and the Campaign's allowed methods.</summary>
public sealed class CharacterSheetEvaluator
{
    private readonly CharacterSheetCalculator _calculator;

    public CharacterSheetEvaluator(ICreationRuleData ruleData)
    {
        _calculator = new CharacterSheetCalculator(ruleData.AgeRules, ruleData.CharacteristicsRules);
    }

    public (CharacterSheetComputation Computation, IReadOnlyList<ValidationError> ValidationErrors) Evaluate(
        CharacterSheet sheet,
        AllowedCreationMethods allowedCreationMethods)
    {
        var computation = _calculator.Calculate(sheet);
        return (computation, CharacterSheetValidator.Validate(sheet, allowedCreationMethods, computation));
    }

    public CharacterSheetView View(Investigator investigator, Campaign campaign, string? playerName)
    {
        var (computation, errors) = Evaluate(investigator.CharacterSheet, campaign.AllowedCreationMethods);
        return new CharacterSheetView(investigator, playerName, computation, errors);
    }
}

/// <summary>
/// The Creation Methods this version can build a Character Sheet with. PBI-CP-003 supports Point Buy only;
/// PBI-CP-009 adds the others.
/// </summary>
public static class SupportedCreationMethods
{
    public static readonly IReadOnlyList<CreationMethod> All = [CreationMethod.PointBuy];

    public static bool AnyAllowedBy(AllowedCreationMethods allowed) => All.Any(allowed.Allows);
}
