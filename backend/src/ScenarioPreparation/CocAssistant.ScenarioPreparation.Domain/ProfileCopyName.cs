namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Names a duplicated profile (specs/scenario-preparation/spec.md, Constraints): the name is shortened so that " (copy)"
/// always stays and the whole name fits <see cref="ProfileLimits.NameMaxLength"/>.
/// </summary>
public static class ProfileCopyName
{
    private const string Suffix = " (copy)";

    public static string For(string name)
    {
        var kept = Math.Min(name.Length, ProfileLimits.NameMaxLength - Suffix.Length);
        if (kept > 0 && kept < name.Length && char.IsHighSurrogate(name[kept - 1]))
        {
            kept--;
        }

        return name[..kept].TrimEnd() + Suffix;
    }
}
