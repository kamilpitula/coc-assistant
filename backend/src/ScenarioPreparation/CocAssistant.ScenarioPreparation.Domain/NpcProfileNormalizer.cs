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

    private static NpcDetails Normalize(NpcDetails details) => new(
        ProfileText.Trimmed(details.ProfessionOrRole),
        ProfileText.Trimmed(details.ShortDescription),
        ProfileText.Trimmed(details.Goal),
        ProfileText.Trimmed(details.RelationshipToInvestigators),
        ProfileText.Trimmed(details.Knowledge),
        ProfileText.Trimmed(details.Secrets),
        ProfileText.Trimmed(details.BehaviorCue));

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

    private static NpcSkill Normalize(NpcSkill skill) => skill with { Name = ProfileText.Trimmed(skill.Name), Specialization = ProfileText.Trimmed(skill.Specialization) };

    private static NpcCombat Normalize(NpcCombat combat) => combat with
    {
        TacticsAndMorale = ProfileText.Trimmed(combat.TacticsAndMorale),
        Weapons = (combat.Weapons ?? []).Select(Normalize).ToList(),
    };

    private static NpcWeapon Normalize(NpcWeapon weapon) => weapon with
    {
        Name = ProfileText.Trimmed(weapon.Name),
        Skill = weapon.Skill is null ? null : new NpcSkillReference(ProfileText.Trimmed(weapon.Skill.Name), ProfileText.Trimmed(weapon.Skill.Specialization)),
        Damage = ProfileText.Trimmed(weapon.Damage),
        Range = ProfileText.Trimmed(weapon.Range),
        Ammunition = ProfileText.Trimmed(weapon.Ammunition),
        Malfunction = ProfileText.Trimmed(weapon.Malfunction),
    };

    private static NpcSpell Normalize(NpcSpell spell) =>
        new(ProfileText.Trimmed(spell.Name), ProfileText.Trimmed(spell.MagicPointCost), ProfileText.Trimmed(spell.Effect));
}
