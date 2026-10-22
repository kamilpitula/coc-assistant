namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>Cleans an uploaded file's name for display and for Content-Disposition; the name never decides the media type or the key.</summary>
internal static class HandoutFileNames
{
    public const int MaxLength = 255;

    private static readonly char[] Separators = ['/', '\\'];

    /// <summary>
    /// The part after the last path separator (either kind, whatever the server's OS), without control characters, trimmed, and
    /// at most 255 characters; a name that ends up empty becomes "image" or "document" by kind.
    /// </summary>
    public static string Clean(string? uploadedName, HandoutKind kind)
    {
        var name = uploadedName ?? string.Empty;
        name = name[(name.LastIndexOfAny(Separators) + 1)..];
        name = new string(name.Where(character => !char.IsControl(character)).ToArray()).Trim();
        if (name.Length > MaxLength)
        {
            name = name[..MaxLength].Trim();
        }

        return name.Length > 0 ? name : DefaultFor(kind);
    }

    private static string DefaultFor(HandoutKind kind) => HandoutKinds.FamilyOf(kind) == HandoutKindFamily.Document ? "document" : "image";
}
