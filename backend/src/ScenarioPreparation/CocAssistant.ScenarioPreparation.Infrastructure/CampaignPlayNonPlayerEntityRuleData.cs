namespace CocAssistant.ScenarioPreparation.Infrastructure;

/// <summary>
/// Adapts Campaign Play's rule data catalogs to Scenario Preparation's <see cref="INonPlayerEntityRuleData"/> port
/// (ADR 0008, ADR 0017). Registered as a singleton, like the catalogs it reads.
/// </summary>
public sealed class CampaignPlayNonPlayerEntityRuleData : INonPlayerEntityRuleData
{
    private readonly ICreationRuleData _ruleData;

    public CampaignPlayNonPlayerEntityRuleData(ICreationRuleData ruleData)
    {
        _ruleData = ruleData;
    }

    public CharacteristicsRules CharacteristicsRules => _ruleData.CharacteristicsRules;

    public CombatSkillSpecializations CombatSkillSpecializations => new(
        SpecializationsOf(CombatSkillSpecializations.FightingName),
        SpecializationsOf(CombatSkillSpecializations.FirearmsName));

    private IReadOnlyList<string> SpecializationsOf(string family) =>
        _ruleData.SkillSpecializations.ClosedFamilies
            .Where(entry => string.Equals(entry.Key, family, StringComparison.OrdinalIgnoreCase))
            .SelectMany(entry => entry.Value.Keys)
            .ToList();
}
