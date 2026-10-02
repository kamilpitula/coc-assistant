namespace CocAssistant.CampaignPlay.Controllers;

/// <summary>
/// Maps the wire format of Campaign rules options: the Era code (for example "1920s") and
/// Creation Method names ("StandardRolling", "PointBuy", "QuickFire"), matched case-sensitively.
/// </summary>
public static class RulesOptionsWireFormat
{
    public static bool IsCreationMethodName(string? name) =>
        name is not null && Enum.GetNames<CreationMethod>().Contains(name, StringComparer.Ordinal);

    /// <summary>Null when the request omitted the Era, so the Campaign default applies.</summary>
    public static Era? ToEra(string? code)
    {
        if (code is null)
        {
            return null;
        }

        return Era.TryParse(code, out var era) ? era : throw new ArgumentException($"Unsupported Era '{code}'.", nameof(code));
    }

    /// <summary>Null when the request omitted the methods, so the Campaign default applies.</summary>
    public static AllowedCreationMethods? ToAllowedCreationMethods(IEnumerable<string>? names) =>
        names is null ? null : AllowedCreationMethods.Create(names.Select(Enum.Parse<CreationMethod>));

    public static IReadOnlyList<string> ToNames(AllowedCreationMethods methods) =>
        methods.Methods.Select(method => method.ToString()).ToList();
}
