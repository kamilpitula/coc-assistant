namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Trims the text of an NPC Profile and drops blank optional text, so validation and storage see what the Keeper meant.
/// Keeper notes are kept exactly as received (ADR 0015). Characteristics are filled out to all eight codes in rule order.
/// </summary>
internal static class NpcProfileNormalizer
{
    public static NpcProfile Normalize(NpcProfile profile) => profile with
    {
        Details = Normalize(profile.Details),
        Characteristics = profile.Characteristics is null ? null : Normalize(profile.Characteristics),
        Skills = profile.Skills?.Select(Normalize).ToList(),
        Combat = profile.Combat is null ? null : Normalize(profile.Combat),
        Spells = profile.Spells?.Select(Normalize).ToList(),
    };

    public static string? Trimmed(string? text) => text?.Trim() is { Length: > 0 } trimmed ? trimmed : null;

    private static NpcDetails Normalize(NpcDetails details) => new(
        Trimmed(details.ProfessionOrRole),
        Trimmed(details.ShortDescription),
        Trimmed(details.Goal),
        Trimmed(details.RelationshipToInvestigators),
        Trimmed(details.Knowledge),
        Trimmed(details.Secrets),
        Trimmed(details.BehaviorCue));

    private static NpcCharacteristics Normalize(NpcCharacteristics characteristics)
    {
        var known = CharacteristicCodes.All.Select(CharacteristicCodes.ToCode).ToList();
        var ordered = known.ToDictionary(code => code, code => characteristics.Values.GetValueOrDefault(code));
        foreach (var unknown in characteristics.Values.Where(entry => !known.Contains(entry.Key)))
        {
            ordered[unknown.Key] = unknown.Value;
        }

        return new NpcCharacteristics(ordered);
    }

    private static NpcSkill Normalize(NpcSkill skill) => skill with { Name = Trimmed(skill.Name), Specialization = Trimmed(skill.Specialization) };

    private static NpcCombat Normalize(NpcCombat combat) => combat with
    {
        TacticsAndMorale = Trimmed(combat.TacticsAndMorale),
        Weapons = (combat.Weapons ?? []).Select(Normalize).ToList(),
    };

    private static NpcWeapon Normalize(NpcWeapon weapon) => weapon with
    {
        Name = Trimmed(weapon.Name),
        Skill = weapon.Skill is null ? null : new NpcSkillReference(Trimmed(weapon.Skill.Name), Trimmed(weapon.Skill.Specialization)),
        Damage = Trimmed(weapon.Damage),
        Range = Trimmed(weapon.Range),
        Ammunition = Trimmed(weapon.Ammunition),
        Malfunction = Trimmed(weapon.Malfunction),
    };

    private static NpcSpell Normalize(NpcSpell spell) =>
        new(Trimmed(spell.Name), Trimmed(spell.MagicPointCost), Trimmed(spell.Effect));
}
