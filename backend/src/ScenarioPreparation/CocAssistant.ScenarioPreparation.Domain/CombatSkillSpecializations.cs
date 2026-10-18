namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The closed Fighting and Firearms specializations (docs/game-rules/project_ruleset.md section 5.7), supplied through
/// <c>INonPlayerEntityRuleData</c>.
/// </summary>
public sealed record CombatSkillSpecializations(IReadOnlyList<string> Fighting, IReadOnlyList<string> Firearms)
{
    public const string FightingName = "Fighting";
    public const string FirearmsName = "Firearms";

    /// <summary>True when the skill name is the Firearms family, ignoring case.</summary>
    public static bool IsFirearms(string? skillName) => SameName(skillName, FirearmsName);

    /// <summary>The family's canonical name when the skill is Fighting or Firearms; otherwise null.</summary>
    public string? FamilyOf(string? skillName) => SameName(skillName, FightingName)
        ? FightingName
        : IsFirearms(skillName) ? FirearmsName : null;

    /// <summary>True when the specialization is listed for the family, ignoring case.</summary>
    public bool Lists(string family, string? specialization)
    {
        var listed = family == FightingName ? Fighting : Firearms;
        return specialization is not null && listed.Any(entry => SameName(entry, specialization));
    }

    internal static bool SameName(string? left, string? right) => string.Equals(left, right, StringComparison.OrdinalIgnoreCase);
}
