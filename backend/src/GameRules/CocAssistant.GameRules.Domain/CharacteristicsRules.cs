namespace CocAssistant.GameRules.Domain;

/// <summary>
/// One band of the Damage Bonus and Build table, mirroring docs/game-rules/catalogs/characteristics-rules.json
/// (docs/game-rules/coc7_character_creation_and_development_rules.md section 5.8).
/// </summary>
public sealed record DamageBonusAndBuildBand(int MinimumStrengthSize, int MaximumStrengthSize, string DamageBonus, int Build)
{
    public bool Contains(int strengthSize) => strengthSize >= MinimumStrengthSize && strengthSize <= MaximumStrengthSize;
}

/// <summary>Characteristic rule data that applies to every Era.</summary>
public sealed record CharacteristicsRules(IReadOnlyList<DamageBonusAndBuildBand> DamageBonusAndBuild);
