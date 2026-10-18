namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>Hit Points, Magic Points, Damage Bonus, and Build worked out from characteristics; each is null when its characteristics are missing.</summary>
public sealed record CharacteristicDerivedValues(int? HitPoints, int? MagicPoints, string? DamageBonus, int? Build)
{
    /// <summary>
    /// Which characteristics feed which value: docs/game-rules/coc_7e_npc_and_monster_creation_ruleset.md section 3.2.
    /// </summary>
    public static CharacteristicDerivedValues From(IReadOnlyDictionary<string, int?> values, CharacteristicsRules rules)
    {
        int? Value(Characteristic characteristic) => values.GetValueOrDefault(characteristic.ToCode());

        var damageAndBuild = DamageAndBuild(Value(Characteristic.Strength), Value(Characteristic.Size), rules);
        return new CharacteristicDerivedValues(
            HitPointsOf(Value(Characteristic.Constitution), Value(Characteristic.Size)),
            Value(Characteristic.Power) is { } power ? GameRules.Domain.MagicPoints.For(power) : null,
            damageAndBuild?.DamageBonus,
            damageAndBuild?.Build);
    }

    private static int? HitPointsOf(int? constitution, int? size) =>
        constitution is { } con && size is { } siz ? GameRules.Domain.HitPoints.For(con, siz) : null;

    private static (string DamageBonus, int Build)? DamageAndBuild(int? strength, int? size, CharacteristicsRules rules) =>
        strength is { } str && size is { } siz ? DamageBonusAndBuild.For(str + siz, rules) : null;
}
