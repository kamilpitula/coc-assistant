namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Builders for NPC Profile test data in domain vocabulary.</summary>
public static class NpcProfileSamples
{
    public static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly DateTimeOffset Now = new(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);

    public const string ValidKeeperNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar\",\"format\":1}]}]}}";

    public static readonly CombatSkillSpecializations Specializations = new(
        ["Axe", "Brawl", "Chainsaw", "Flail", "Garrote", "Spear", "Sword", "Whip"],
        ["Bow", "Handgun", "Heavy Weapons", "Flamethrower", "Machine Gun", "Rifle/Shotgun", "Submachine Gun"]);

    public static readonly CharacteristicsRules Rules = new(
    [
        new DamageBonusAndBuildBand(2, 64, "-2", -2),
        new DamageBonusAndBuildBand(65, 84, "-1", -1),
        new DamageBonusAndBuildBand(85, 124, "0", 0),
        new DamageBonusAndBuildBand(125, 164, "+1D4", 1),
    ]);

    public static HumanNpc HumanNpc(string name = "Mr. Knott", int age = 62) =>
        Domain.HumanNpc.Create(CampaignId, name, age, Now).HumanNpc!;

    public static NpcProfile Narrative(int? age = 62) => NpcProfile.Narrative(age);

    public static NpcCharacteristics Characteristics(params (string Code, int? Value)[] values) =>
        new(values.ToDictionary(entry => entry.Code, entry => entry.Value));

    public static NpcSkill Skill(string name, int? value = 50, string? specialization = null) => new(name, specialization, value);

    public static NpcWeapon Weapon(string name = "Revolver", string skillName = "Firearms", string? skillSpecialization = "Handgun", string? damage = "1D10", int? attacks = 1) =>
        new(name, new NpcSkillReference(skillName, skillSpecialization), damage, attacks, null, null, null, false);

    public static NpcCombat Combat(params NpcWeapon[] weapons) => new(null, null, null, weapons);

    public static NpcSpell Spell(string name = "Contact Deity", string? cost = "5", string? effect = null) => new(name, cost, effect);

    /// <summary>The Thug of the derived-values scenario: STR 70, CON 60, SIZ 65, DEX 55, POW 50, aged 30.</summary>
    public static NpcProfile Thug() => Narrative(30) with
    {
        Characteristics = Characteristics(("STR", 70), ("CON", 60), ("SIZ", 65), ("DEX", 55), ("POW", 50)),
    };

    public static string LongText(int length) => new('x', length);
}
