namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Maps Human NPC requests to domain profiles and application views to responses.</summary>
internal static class HumanNpcMapping
{
    public static NpcProfile ToProfile(HumanNpcRequest request) =>
        new(
            request.Age,
            request.Details is null ? NpcDetails.Empty : ToDetails(request.Details),
            request.KeeperNotes is { ValueKind: not JsonValueKind.Null } notes ? notes.GetRawText() : null,
            request.Characteristics is null ? null : new NpcCharacteristics(request.Characteristics),
            request.Skills?.Select(skill => new NpcSkill(skill.Name, skill.Specialization, skill.Value)).ToList(),
            request.Combat is null ? null : ToCombat(request.Combat),
            request.Spells?.Select(spell => new NpcSpell(spell.Name, spell.MagicPointCost, spell.Effect)).ToList());

    public static HumanNpcResponse ToResponse(HumanNpcView view)
    {
        var profile = view.Profile;
        return new HumanNpcResponse(
            view.Id,
            view.Name,
            profile.Age,
            ToResponse(profile.Details),
            ParseNotes(profile.KeeperNotes),
            profile.Characteristics is null ? null : ToResponse(profile.Characteristics, view),
            profile.Skills?.Select((skill, index) => new NpcSkillResponse(skill.Name, skill.Specialization, skill.Value, view.SkillDifficulties[index].ToString())).ToList(),
            profile.Combat is null ? null : ToResponse(profile.Combat, view.DodgeDifficulty),
            profile.Spells?.Select(spell => new NpcSpellResponse(spell.Name, spell.MagicPointCost, spell.Effect)).ToList());
    }

    public static NonPlayerEntityListResponse ToResponse(IReadOnlyList<NonPlayerEntitySummary> summaries) =>
        new(summaries.Select(summary => new NonPlayerEntitySummaryResponse(summary.Id, summary.Type.ToString(), summary.Name)).ToList());

    private static NpcDetails ToDetails(NpcDetailsRequest details) =>
        new(
            details.ProfessionOrRole,
            details.ShortDescription,
            details.Goal,
            details.RelationshipToInvestigators,
            details.Knowledge,
            details.Secrets,
            details.BehaviorCue);

    private static NpcCombat ToCombat(NpcCombatRequest combat) =>
        new(
            combat.Dodge,
            combat.ArmorPoints,
            combat.TacticsAndMorale,
            (combat.Weapons ?? []).Select(weapon => new NpcWeapon(
                weapon.Name,
                weapon.Skill is null ? null : new NpcSkillReference(weapon.Skill.Name, weapon.Skill.Specialization),
                weapon.Damage,
                weapon.AttacksPerRound,
                weapon.Range,
                weapon.Ammunition,
                weapon.Malfunction,
                weapon.Impaling)).ToList());

    private static NpcDetailsResponse ToResponse(NpcDetails details) =>
        new(
            details.ProfessionOrRole,
            details.ShortDescription,
            details.Goal,
            details.RelationshipToInvestigators,
            details.Knowledge,
            details.Secrets,
            details.BehaviorCue);

    private static NpcCharacteristicsResponse ToResponse(NpcCharacteristics characteristics, HumanNpcView view) =>
        new(
            characteristics.Values,
            view.CharacteristicDifficulties.ToDictionary(entry => entry.Key, entry => entry.Value.ToString()),
            new NpcDerivedValuesResponse(
                view.Derived.HitPoints,
                view.Derived.MagicPoints,
                view.Derived.DamageBonus,
                view.Derived.Build,
                view.Derived.MovementRate,
                view.Derived.MovementRateNotCovered));

    private static NpcCombatResponse ToResponse(NpcCombat combat, InvestigatorDifficulty? dodgeDifficulty) =>
        new(
            combat.Dodge,
            dodgeDifficulty?.ToString(),
            combat.ArmorPoints,
            combat.TacticsAndMorale,
            combat.Weapons.Select(weapon => new NpcWeaponResponse(
                weapon.Name,
                weapon.Skill is null ? null : new NpcSkillReferenceRequest(weapon.Skill.Name, weapon.Skill.Specialization),
                weapon.Damage,
                weapon.AttacksPerRound,
                weapon.Range,
                weapon.Ammunition,
                weapon.Malfunction,
                weapon.Impaling)).ToList());

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
