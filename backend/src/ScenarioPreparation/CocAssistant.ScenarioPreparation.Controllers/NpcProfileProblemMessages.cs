namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The user-facing message of each NPC Profile problem (ADR 0018). The domain reports a path and a kind; the copy lives
/// here, as ScenesController owns its copy. The messages are specified in specs/scenario-preparation/ux.md section 25.4.
/// </summary>
public static class NpcProfileProblemMessages
{
    private static readonly IReadOnlyDictionary<NpcProfileProblemKind, Func<NpcProfileProblem, string>> Messages =
        new Dictionary<NpcProfileProblemKind, Func<NpcProfileProblem, string>>
        {
            [NpcProfileProblemKind.NameRequired] = _ => "Enter a name.",
            [NpcProfileProblemKind.NameTooLong] = _ => $"Name must be {NpcProfileLimits.NameMaxLength} characters or fewer.",
            [NpcProfileProblemKind.AgeRequired] = _ => "Enter an age.",
            [NpcProfileProblemKind.AgeOutOfRange] = _ => $"Enter an age from 0 to {NpcProfileLimits.AgeMaximum}, in whole years.",
            [NpcProfileProblemKind.TextTooLong] = problem => $"{FieldLabel(problem.Path)} must be 4,000 characters or fewer.",
            [NpcProfileProblemKind.RowTextTooLong] = problem => $"{FieldLabel(problem.Path)} must be 1,000 characters or fewer.",
            [NpcProfileProblemKind.TooManyRows] = problem => $"Add at most {NpcProfileLimits.MaxRows} {ItemsLabel(problem.Path)}.",
            [NpcProfileProblemKind.UnknownCharacteristic] = problem => $"{ProfileProblemPaths.LastSegment(problem.Path)} isn't a characteristic.",
            [NpcProfileProblemKind.CharacteristicOutOfRange] = problem => $"Enter {ProfileProblemPaths.LastSegment(problem.Path)} from 0 to 100.",
            [NpcProfileProblemKind.SkillNameRequired] = _ => "Enter the skill's name.",
            [NpcProfileProblemKind.SkillValueOutOfRange] = _ => "Enter a value from 0 to 100.",
            [NpcProfileProblemKind.SpecializationNotListed] = problem => $"Choose a {problem.Subject} specialization from the list.",
            [NpcProfileProblemKind.DodgeOutOfRange] = _ => "Enter Dodge from 0 to 100.",
            [NpcProfileProblemKind.ArmorPointsOutOfRange] = _ => "Enter armor points from 0 to 2,000.",
            [NpcProfileProblemKind.WeaponNameRequired] = _ => "Enter the weapon's name.",
            [NpcProfileProblemKind.WeaponSkillNotOnProfile] = _ => "Choose a skill this Human NPC has.",
            [NpcProfileProblemKind.DamageRequired] = _ => "Enter the damage.",
            [NpcProfileProblemKind.DamageMalformed] = _ => "Write the damage as dice and numbers, for example 1D6+DB or 2D6-1.",
            [NpcProfileProblemKind.DamageBonusOnFirearm] = _ => "Damage Bonus doesn't apply to firearms. Remove DB from the damage.",
            [NpcProfileProblemKind.AttacksPerRoundOutOfRange] = _ => "Enter attacks per round from 1 to 99.",
            [NpcProfileProblemKind.SpellNameRequired] = _ => "Enter the spell's name.",
            [NpcProfileProblemKind.KeeperNotesInvalid] = _ =>
                $"The Keeper notes must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes.",
        };

    // Labels for "{Field} must be ... characters or fewer", keyed by the path without row indexes.
    private static readonly IReadOnlyDictionary<string, string> FieldLabels = new Dictionary<string, string>
    {
        ["details.professionOrRole"] = "Profession or role",
        ["details.shortDescription"] = "Short description",
        ["details.goal"] = "Goal",
        ["details.relationshipToInvestigators"] = "Relationship to the Investigators",
        ["details.knowledge"] = "What the Human NPC knows",
        ["details.secrets"] = "What the Human NPC hides",
        ["details.behaviorCue"] = "Behavior cue",
        ["combat.tacticsAndMorale"] = "Tactics and morale",
        ["skills.name"] = "Skill name",
        ["skills.specialization"] = "Specialization",
        ["combat.weapons.name"] = "Weapon name",
        ["combat.weapons.damage"] = "Damage",
        ["combat.weapons.range"] = "Range",
        ["combat.weapons.ammunition"] = "Ammunition",
        ["combat.weapons.malfunction"] = "Malfunction",
        ["spells.name"] = "Spell name",
        ["spells.magicPointCost"] = "Magic Point cost",
        ["spells.effect"] = "Effect",
    };

    private static readonly IReadOnlyDictionary<string, string> ItemLabels = new Dictionary<string, string>
    {
        ["skills"] = "skills",
        ["combat.weapons"] = "weapons",
        ["spells"] = "spells",
    };

    public static string For(NpcProfileProblem problem) => Messages[problem.Kind](problem);

    private static string FieldLabel(string path) => ProfileProblemPaths.FieldLabel(FieldLabels, path);

    private static string ItemsLabel(string path) => ItemLabels.GetValueOrDefault(path, "rows");
}
