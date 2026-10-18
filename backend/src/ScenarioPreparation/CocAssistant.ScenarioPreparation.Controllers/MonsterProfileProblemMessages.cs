namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>
/// The user-facing message of each Monster Profile problem (ADR 0018). The domain reports a path and a kind; the copy
/// lives here. The messages are specified in specs/scenario-preparation/ux.md section 25.5.
/// </summary>
public static class MonsterProfileProblemMessages
{
    private static readonly IReadOnlyDictionary<MonsterProfileProblemKind, Func<MonsterProfileProblem, string>> Messages =
        new Dictionary<MonsterProfileProblemKind, Func<MonsterProfileProblem, string>>
        {
            [MonsterProfileProblemKind.NameRequired] = _ => "Enter a name.",
            [MonsterProfileProblemKind.NameTooLong] = _ => $"Name must be {ProfileLimits.NameMaxLength} characters or fewer.",
            [MonsterProfileProblemKind.CreatureKindNotListed] = _ => "Choose a Creature Kind from the list.",
            [MonsterProfileProblemKind.TextTooLong] = problem => $"{FieldLabel(problem.Path)} must be 4,000 characters or fewer.",
            [MonsterProfileProblemKind.RowTextTooLong] = problem => $"{FieldLabel(problem.Path)} must be 1,000 characters or fewer.",
            [MonsterProfileProblemKind.TooManyRows] = problem => $"Add at most {ProfileLimits.MaxRows} {ItemsLabel(problem.Path)}.",
            [MonsterProfileProblemKind.UnknownCharacteristic] = problem => $"{ProfileProblemPaths.LastSegment(problem.Path)} isn't a characteristic.",
            [MonsterProfileProblemKind.CharacteristicOutOfRange] = problem => $"Enter {ProfileProblemPaths.LastSegment(problem.Path)} from 0 to 2,000.",
            [MonsterProfileProblemKind.OverrideValueRequired] = _ => "Enter the override.",
            [MonsterProfileProblemKind.HitPointsOverrideOutOfRange] = _ => "Enter Hit Points from 1 to 9,999.",
            [MonsterProfileProblemKind.MagicPointsOverrideOutOfRange] = _ => "Enter Magic Points from 0 to 9,999.",
            [MonsterProfileProblemKind.BuildOverrideOutOfRange] = _ => "Enter Build from -2 to 99.",
            [MonsterProfileProblemKind.DamageBonusOverrideMalformed] = _ => "Write the Damage Bonus like +1D4, -1, or 0.",
            [MonsterProfileProblemKind.OverrideReasonRequired] = _ => "Give a reason for the override.",
            [MonsterProfileProblemKind.OverrideReasonTooLong] = _ => $"Reason must be {MonsterProfileLimits.OverrideReasonMaxLength} characters or fewer.",
            [MonsterProfileProblemKind.HitPointsOverriddenAndNotApplicable] = _ => "Choose either an override or not applicable for Hit Points.",
            [MonsterProfileProblemKind.DefeatOutcomeRequired] = _ => "Describe the defeat outcome, because Hit Points don't apply.",
            [MonsterProfileProblemKind.MovementModeNotListed] = _ => "Choose a mode from the list.",
            [MonsterProfileProblemKind.MovementLabelRequired] = _ => "Name the mode.",
            [MonsterProfileProblemKind.MovementRateOutOfRange] = _ => "Enter a rate from 0 to 999.",
            [MonsterProfileProblemKind.AttacksPerRoundOutOfRange] = _ => "Enter attacks per round from 1 to 99.",
            [MonsterProfileProblemKind.DodgeOutOfRange] = _ => "Enter Dodge from 0 to 2,000.",
            [MonsterProfileProblemKind.ArmorPointsOutOfRange] = _ => "Enter armor points from 0 to 2,000.",
            [MonsterProfileProblemKind.AttackNameRequired] = _ => "Enter the attack's name.",
            [MonsterProfileProblemKind.AttackSkillRequired] = _ => "Enter the attack's skill.",
            [MonsterProfileProblemKind.AttackSkillValueOutOfRange] = _ => "Enter a skill value from 0 to 2,000.",
            [MonsterProfileProblemKind.AttackDamageRequired] = _ => "Enter the damage, or mark the attack as a manoeuvre.",
            [MonsterProfileProblemKind.DamageMalformed] = _ => "Write the damage as dice and numbers, for example 1D6+DB or 2D6-1.",
            [MonsterProfileProblemKind.DamageBonusOnFirearm] = _ => "Damage Bonus doesn't apply to firearms. Remove DB from the damage.",
            [MonsterProfileProblemKind.ImmunityDescriptionRequired] = _ => "Describe the immunity.",
            [MonsterProfileProblemKind.VulnerabilityDescriptionRequired] = _ => "Describe the vulnerability.",
            [MonsterProfileProblemKind.SkillNameRequired] = _ => "Enter the skill's name.",
            [MonsterProfileProblemKind.SkillValueOutOfRange] = _ => "Enter a value from 0 to 2,000.",
            [MonsterProfileProblemKind.SpellNameRequired] = _ => "Enter the spell's name.",
            [MonsterProfileProblemKind.PowerNameRequired] = _ => "Enter the power's name.",
            [MonsterProfileProblemKind.SanityLossMalformed] = _ => "Write the Sanity loss as success/failure, for example 0/1D6.",
            [MonsterProfileProblemKind.KeeperNotesInvalid] = _ =>
                $"The Keeper notes must use only the allowed rich-text nodes and be at most {RichTextDocument.MaxBytes} bytes.",
        };

    // Labels for "{Field} must be ... characters or fewer", keyed by the path without row indexes.
    private static readonly IReadOnlyDictionary<string, string> FieldLabels = new Dictionary<string, string>
    {
        ["details.descriptionAndSensoryCues"] = "Description and sensory cues",
        ["details.origin"] = "Origin",
        ["details.goalAndBehavior"] = "Goal and typical behavior",
        ["details.signsAndTraces"] = "Signs and traces",
        ["details.defeatOutcome"] = "Defeat outcome",
        ["details.specimenRangeNotes"] = "Specimen range notes",
        ["characteristics.overrides.damageBonus.value"] = "Damage Bonus",
        ["movement.label"] = "Name of the mode",
        ["combat.attacks.name"] = "Attack name",
        ["combat.attacks.skill"] = "Attack skill",
        ["combat.attacks.damage"] = "Damage",
        ["combat.attacks.effect"] = "Effect",
        ["defenses.armorNote"] = "Armor note",
        ["defenses.immunities.description"] = "Immunity",
        ["defenses.vulnerabilities.description"] = "Vulnerability",
        ["skills.name"] = "Skill name",
        ["spells.name"] = "Spell name",
        ["spells.magicPointCost"] = "Magic Point cost",
        ["spells.effect"] = "Effect",
        ["powers.name"] = "Power name",
        ["powers.magicPointCost"] = "Magic Point cost",
        ["powers.effect"] = "Effect",
        ["powers.limits"] = "Limits",
        ["sanityLoss.value"] = "Sanity loss",
    };

    private static readonly IReadOnlyDictionary<string, string> ItemLabels = new Dictionary<string, string>
    {
        ["movement"] = "movement modes",
        ["combat.attacks"] = "attacks",
        ["defenses.immunities"] = "immunities",
        ["defenses.vulnerabilities"] = "vulnerabilities",
        ["skills"] = "skills",
        ["spells"] = "spells",
        ["powers"] = "powers",
    };

    public static string For(MonsterProfileProblem problem) => Messages[problem.Kind](problem);

    private static string FieldLabel(string path) => ProfileProblemPaths.FieldLabel(FieldLabels, path);

    private static string ItemsLabel(string path) => ItemLabels.GetValueOrDefault(path, "rows");
}
