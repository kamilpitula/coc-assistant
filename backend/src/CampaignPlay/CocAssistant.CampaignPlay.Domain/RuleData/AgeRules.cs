namespace CocAssistant.CampaignPlay.Domain.RuleData;

/// <summary>
/// One creation age bracket, mirroring an entry of docs/game-rules/catalogs/age-rules.json
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 3.1).
/// </summary>
public sealed record AgeBracket(
    int MinimumAge,
    int MaximumAge,
    int PhysicalDeductionTotal,
    IReadOnlyList<Characteristic> PhysicalDeductionCharacteristics,
    int AppearanceModifier,
    int EduImprovementChecks,
    int LuckRolls)
{
    public bool Contains(int age) => age >= MinimumAge && age <= MaximumAge;

    public bool AllowsDeductionFrom(Characteristic characteristic) => PhysicalDeductionCharacteristics.Contains(characteristic);
}

/// <summary>The creation age brackets; ages the rules leave to Keeper adjudication have no bracket.</summary>
public sealed record AgeRules(IReadOnlyList<AgeBracket> Brackets)
{
    /// <summary>The single applicable bracket (section 3.1 applies one bracket only), or null when none applies automatically.</summary>
    public AgeBracket? BracketFor(int age) => Brackets.SingleOrDefault(bracket => bracket.Contains(age));
}
