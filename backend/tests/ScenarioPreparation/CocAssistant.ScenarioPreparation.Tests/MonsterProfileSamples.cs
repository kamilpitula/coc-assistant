namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Builders for Mythos Creature and Monster Profile test data in domain vocabulary.</summary>
public static class MonsterProfileSamples
{
    public static readonly Guid CampaignId = NpcProfileSamples.CampaignId;
    public static readonly DateTimeOffset Now = NpcProfileSamples.Now;
    public static readonly CharacteristicsRules Rules = NpcProfileSamples.Rules;

    public static MythosCreature MythosCreature(string name = "Ghoul") =>
        Domain.MythosCreature.Create(CampaignId, name, Now).MythosCreature!;

    public static MonsterCharacteristics Characteristics(params (string Code, int? Value)[] values) =>
        new(values.ToDictionary(entry => entry.Code, entry => entry.Value), false, MonsterOverrides.None);

    public static MonsterProfile WithCharacteristics(MonsterCharacteristics characteristics) =>
        MonsterProfile.Empty with { Characteristics = characteristics };

    public static MonsterCharacteristics WithOverrides(MonsterOverrides overrides, bool hitPointsNotApplicable = false) =>
        Characteristics(("STR", 80), ("CON", 60), ("SIZ", 60)) with { Overrides = overrides, HitPointsNotApplicable = hitPointsNotApplicable };

    public static MonsterAttack Attack(
        string? name = "Claw",
        string? skill = "Fighting",
        int? skillValue = 40,
        string? damage = "1D6+DB",
        string? effect = null,
        bool manoeuvre = false) =>
        new(name, skill, skillValue, damage, effect, manoeuvre);

    public static MonsterProfile WithAttacks(params MonsterAttack[] attacks) =>
        MonsterProfile.Empty with { Combat = new MonsterCombat(3, 50, attacks) };

    /// <summary>The Ghoul of the derived-values scenario: STR 80, CON 60, SIZ 60, DEX 60, INT 60, POW 60.</summary>
    public static MonsterProfile Ghoul() => MonsterProfile.Empty with
    {
        Details = MonsterDetails.Empty with { CreatureKind = "Mythos" },
        Characteristics = Characteristics(("STR", 80), ("CON", 60), ("SIZ", 60), ("DEX", 60), ("INT", 60), ("POW", 60)),
        Combat = new MonsterCombat(3, 30, [Attack()]),
        Defenses = new MonsterDefenses(0, null, [], []),
        SanityLoss = new MonsterSanityLoss("0/1D6"),
    };

    public static string LongText(int length) => NpcProfileSamples.LongText(length);
}
