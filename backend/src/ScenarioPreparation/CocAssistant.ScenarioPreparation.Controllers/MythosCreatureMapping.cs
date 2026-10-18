namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Maps Mythos Creature requests to domain profiles and application views to responses.</summary>
internal static class MythosCreatureMapping
{
    public static MonsterProfile ToProfile(MythosCreatureRequest request) =>
        new(
            request.Details is null ? MonsterDetails.Empty : ToDetails(request.Details),
            request.KeeperNotes is { ValueKind: not JsonValueKind.Null } notes ? notes.GetRawText() : null,
            MapOrNull(request.Characteristics, ToCharacteristics),
            request.Movement?.Select(mode => new MonsterMovementMode(mode.Mode, mode.Label, mode.Rate)).ToList(),
            MapOrNull(request.Combat, ToCombat),
            MapOrNull(request.Defenses, ToDefenses),
            request.Skills?.Select(skill => new MonsterSkill(skill.Name, skill.Value)).ToList(),
            request.Spells?.Select(spell => new MonsterSpell(spell.Name, spell.MagicPointCost, spell.Effect)).ToList(),
            request.Powers?.Select(power => new MonsterPower(power.Name, power.MagicPointCost, power.Effect, power.Limits)).ToList(),
            MapOrNull(request.SanityLoss, sanityLoss => new MonsterSanityLoss(sanityLoss.Value)));

    public static MythosCreatureResponse ToResponse(MythosCreatureView view)
    {
        var profile = view.Profile;
        return new MythosCreatureResponse(
            view.Id,
            view.Name,
            ToDetailsRequest(profile.Details),
            ParseNotes(profile.KeeperNotes),
            MapOrNull(profile.Characteristics, characteristics => ToResponse(characteristics, view)),
            profile.Movement?.Select(mode => new MonsterMovementModeRequest(mode.Mode, mode.Label, mode.Rate)).ToList(),
            MapOrNull(profile.Combat, combat => ToResponse(combat, view)),
            MapOrNull(profile.Defenses, ToDefensesRequest),
            profile.Skills?.Select((skill, index) => new MonsterSkillResponse(skill.Name, skill.Value, view.SkillDifficulties[index].ToString())).ToList(),
            profile.Spells?.Select(spell => new MonsterSpellRequest(spell.Name, spell.MagicPointCost, spell.Effect)).ToList(),
            profile.Powers?.Select(power => new MonsterPowerRequest(power.Name, power.MagicPointCost, power.Effect, power.Limits)).ToList(),
            MapOrNull(profile.SanityLoss, sanityLoss => new MonsterSanityLossRequest(sanityLoss.Value)));
    }

    private static TOut? MapOrNull<TIn, TOut>(TIn? value, Func<TIn, TOut> map)
        where TIn : class
        where TOut : class =>
        value is null ? null : map(value);

    private static MonsterDetails ToDetails(MonsterDetailsRequest details) =>
        new(
            details.CreatureKind,
            details.DescriptionAndSensoryCues,
            details.Origin,
            details.GoalAndBehavior,
            details.SignsAndTraces,
            details.DefeatOutcome,
            details.SpecimenRangeNotes);

    private static MonsterDetailsRequest ToDetailsRequest(MonsterDetails details) =>
        new(
            details.CreatureKind,
            details.DescriptionAndSensoryCues,
            details.Origin,
            details.GoalAndBehavior,
            details.SignsAndTraces,
            details.DefeatOutcome,
            details.SpecimenRangeNotes);

    private static MonsterCharacteristics ToCharacteristics(MonsterCharacteristicsRequest characteristics) =>
        new(
            characteristics.Values ?? new Dictionary<string, int?>(),
            characteristics.HitPointsNotApplicable,
            characteristics.Overrides is null ? MonsterOverrides.None : ToOverrides(characteristics.Overrides));

    private static MonsterOverrides ToOverrides(MonsterOverridesRequest overrides) =>
        new(
            ToOverride(overrides.HitPoints),
            ToOverride(overrides.MagicPoints),
            overrides.DamageBonus is null ? null : new DamageBonusOverride(overrides.DamageBonus.Value, overrides.DamageBonus.Reason),
            ToOverride(overrides.Build));

    private static NumberOverride? ToOverride(NumberOverrideRequest? made) => made is null ? null : new NumberOverride(made.Value, made.Reason);

    private static MonsterOverridesRequest ToOverridesRequest(MonsterOverrides overrides) =>
        new(
            ToOverrideRequest(overrides.HitPoints),
            ToOverrideRequest(overrides.MagicPoints),
            overrides.DamageBonus is null ? null : new DamageBonusOverrideRequest(overrides.DamageBonus.Value, overrides.DamageBonus.Reason),
            ToOverrideRequest(overrides.Build));

    private static NumberOverrideRequest? ToOverrideRequest(NumberOverride? made) => made is null ? null : new NumberOverrideRequest(made.Value, made.Reason);

    private static MonsterCombat ToCombat(MonsterCombatRequest combat) =>
        new(
            combat.AttacksPerRound,
            combat.Dodge,
            (combat.Attacks ?? []).Select(attack => new MonsterAttack(attack.Name, attack.Skill, attack.SkillValue, attack.Damage, attack.Effect, attack.Manoeuvre)).ToList());

    private static MonsterDefenses ToDefenses(MonsterDefensesRequest defenses) =>
        new(
            defenses.ArmorPoints,
            defenses.ArmorNote,
            (defenses.Immunities ?? []).Select(entry => new MonsterDefenseEntry(entry.Description)).ToList(),
            (defenses.Vulnerabilities ?? []).Select(entry => new MonsterDefenseEntry(entry.Description)).ToList());

    private static MonsterDefensesRequest ToDefensesRequest(MonsterDefenses defenses) =>
        new(
            defenses.ArmorPoints,
            defenses.ArmorNote,
            defenses.Immunities.Select(entry => new MonsterDefenseEntryRequest(entry.Description)).ToList(),
            defenses.Vulnerabilities.Select(entry => new MonsterDefenseEntryRequest(entry.Description)).ToList());

    private static MonsterCharacteristicsResponse ToResponse(MonsterCharacteristics characteristics, MythosCreatureView view) =>
        new(
            characteristics.Values,
            characteristics.HitPointsNotApplicable,
            ToOverridesRequest(characteristics.Overrides),
            view.CharacteristicDifficulties.ToDictionary(entry => entry.Key, entry => entry.Value.ToString()),
            new MonsterDerivedValuesResponse(view.Derived.HitPoints, view.Derived.MagicPoints, view.Derived.DamageBonus, view.Derived.Build));

    private static MonsterCombatResponse ToResponse(MonsterCombat combat, MythosCreatureView view) =>
        new(
            combat.AttacksPerRound,
            combat.Dodge,
            view.DodgeDifficulty?.ToString(),
            combat.Attacks
                .Select((attack, index) => new MonsterAttackResponse(
                    attack.Name,
                    attack.Skill,
                    attack.SkillValue,
                    view.AttackDifficulties[index].ToString(),
                    attack.Damage,
                    attack.Effect,
                    attack.Manoeuvre))
                .ToList());

    private static JsonElement? ParseNotes(string? storedJson)
    {
        if (storedJson is null)
        {
            return null;
        }

        using var document = JsonDocument.Parse(storedJson);
        return document.RootElement.Clone();
    }
}
