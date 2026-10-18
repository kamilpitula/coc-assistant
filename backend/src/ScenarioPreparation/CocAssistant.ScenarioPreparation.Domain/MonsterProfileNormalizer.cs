namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Trims the text of a Monster Profile, drops blank optional text, and stores the canonical casing of the Creature Kind
/// and movement modes. Keeper notes are kept exactly as received (ADR 0015). Characteristics are filled out to all eight
/// codes in the Monster Profile order (docs/game-rules/project_ruleset.md section 5.2). One method per section.
/// </summary>
internal static class MonsterProfileNormalizer
{
    private static readonly IReadOnlyList<string> CharacteristicOrder =
        new[]
        {
            Characteristic.Strength,
            Characteristic.Constitution,
            Characteristic.Size,
            Characteristic.Dexterity,
            Characteristic.Intelligence,
            Characteristic.Power,
            Characteristic.Appearance,
            Characteristic.Education,
        }.Select(CharacteristicCodes.ToCode).ToList();

    public static MonsterProfile Normalize(MonsterProfile profile) => profile with
    {
        Details = Normalize(profile.Details),
        Characteristics = profile.Characteristics is null ? null : Normalize(profile.Characteristics),
        Movement = profile.Movement?.Select(Normalize).ToList(),
        Combat = profile.Combat is null ? null : Normalize(profile.Combat),
        Defenses = profile.Defenses is null ? null : Normalize(profile.Defenses),
        Skills = profile.Skills?.Select(skill => skill with { Name = ProfileText.Trimmed(skill.Name) }).ToList(),
        Spells = profile.Spells?.Select(Normalize).ToList(),
        Powers = profile.Powers?.Select(Normalize).ToList(),
        SanityLoss = profile.SanityLoss is null ? null : new MonsterSanityLoss(ProfileText.Trimmed(profile.SanityLoss.Value)),
    };

    private static MonsterDetails Normalize(MonsterDetails details) => new(
        Canonical<CreatureKind>(details.CreatureKind),
        ProfileText.Trimmed(details.DescriptionAndSensoryCues),
        ProfileText.Trimmed(details.Origin),
        ProfileText.Trimmed(details.GoalAndBehavior),
        ProfileText.Trimmed(details.SignsAndTraces),
        ProfileText.Trimmed(details.DefeatOutcome),
        ProfileText.Trimmed(details.SpecimenRangeNotes));

    // A trimmed value that is not listed is kept, so validation can refuse it.
    private static string? Canonical<TEnum>(string? text)
        where TEnum : struct, Enum
    {
        var trimmed = ProfileText.Trimmed(text);
        return EnumNames.Canonical<TEnum>(trimmed) ?? trimmed;
    }

    private static MonsterCharacteristics Normalize(MonsterCharacteristics characteristics)
    {
        var ordered = CharacteristicOrder.ToDictionary(code => code, code => characteristics.Values.GetValueOrDefault(code));
        foreach (var unknown in characteristics.Values.Where(entry => !CharacteristicOrder.Contains(entry.Key)))
        {
            ordered[unknown.Key] = unknown.Value;
        }

        return characteristics with { Values = ordered, Overrides = Normalize(characteristics.Overrides) };
    }

    private static MonsterOverrides Normalize(MonsterOverrides overrides) => new(
        overrides.HitPoints is null ? null : overrides.HitPoints with { Reason = ProfileText.Trimmed(overrides.HitPoints.Reason) },
        overrides.MagicPoints is null ? null : overrides.MagicPoints with { Reason = ProfileText.Trimmed(overrides.MagicPoints.Reason) },
        overrides.DamageBonus is null
            ? null
            : new DamageBonusOverride(ProfileText.Trimmed(overrides.DamageBonus.Value), ProfileText.Trimmed(overrides.DamageBonus.Reason)),
        overrides.Build is null ? null : overrides.Build with { Reason = ProfileText.Trimmed(overrides.Build.Reason) });

    private static MonsterMovementMode Normalize(MonsterMovementMode mode) =>
        mode with { Mode = Canonical<MovementModeKind>(mode.Mode), Label = ProfileText.Trimmed(mode.Label) };

    private static MonsterCombat Normalize(MonsterCombat combat) => combat with
    {
        Attacks = (combat.Attacks ?? []).Select(Normalize).ToList(),
    };

    private static MonsterAttack Normalize(MonsterAttack attack) => attack with
    {
        Name = ProfileText.Trimmed(attack.Name),
        Skill = ProfileText.Trimmed(attack.Skill),
        Damage = ProfileText.Trimmed(attack.Damage),
        Effect = ProfileText.Trimmed(attack.Effect),
    };

    private static MonsterDefenses Normalize(MonsterDefenses defenses) => defenses with
    {
        ArmorNote = ProfileText.Trimmed(defenses.ArmorNote),
        Immunities = (defenses.Immunities ?? []).Select(Normalize).ToList(),
        Vulnerabilities = (defenses.Vulnerabilities ?? []).Select(Normalize).ToList(),
    };

    private static MonsterDefenseEntry Normalize(MonsterDefenseEntry entry) => new(ProfileText.Trimmed(entry.Description));

    private static MonsterSpell Normalize(MonsterSpell spell) =>
        new(ProfileText.Trimmed(spell.Name), ProfileText.Trimmed(spell.MagicPointCost), ProfileText.Trimmed(spell.Effect));

    private static MonsterPower Normalize(MonsterPower power) =>
        new(ProfileText.Trimmed(power.Name), ProfileText.Trimmed(power.MagicPointCost), ProfileText.Trimmed(power.Effect), ProfileText.Trimmed(power.Limits));
}
