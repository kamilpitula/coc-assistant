namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The Creature Kind of a Mythos Creature (CONTEXT.md). It only organizes profiles and has no game effect
/// (docs/game-rules/project_ruleset.md section 5.1).
/// </summary>
public enum CreatureKind
{
    Beast,
    Folklore,
    Mythos,
    Unique,
}

/// <summary>A way a Mythos Creature moves (docs/game-rules/project_ruleset.md section 5.4). Other carries a label.</summary>
public enum MovementModeKind
{
    Walk,
    Swim,
    Fly,
    Burrow,
    Other,
}

/// <summary>Finds the canonical name of an enum value from text, ignoring case; numbers and unknown names are not matches.</summary>
internal static class EnumNames
{
    public static string? Canonical<TEnum>(string? text)
        where TEnum : struct, Enum =>
        Enum.GetNames<TEnum>().FirstOrDefault(name => string.Equals(name, text, StringComparison.OrdinalIgnoreCase));
}
