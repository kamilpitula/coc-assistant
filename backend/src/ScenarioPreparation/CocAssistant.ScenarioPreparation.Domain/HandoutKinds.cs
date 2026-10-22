namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>What a Handout holds: rich text, or one picture (Image, Map), or one document. A kind can change only within its family.</summary>
public enum HandoutKindFamily
{
    RichText,
    Picture,
    Document,
}

/// <summary>Lookup of each <see cref="HandoutKind"/>'s family and the media types a kind may store (PBI-SP-007 D8).</summary>
public static class HandoutKinds
{
    private static readonly Dictionary<HandoutKind, HandoutKindFamily> Families = new()
    {
        [HandoutKind.ReadAloud] = HandoutKindFamily.RichText,
        [HandoutKind.Text] = HandoutKindFamily.RichText,
        [HandoutKind.Image] = HandoutKindFamily.Picture,
        [HandoutKind.Map] = HandoutKindFamily.Picture,
        [HandoutKind.Document] = HandoutKindFamily.Document,
    };

    private static readonly Dictionary<HandoutKindFamily, string[]> MediaTypesByFamily = new()
    {
        [HandoutKindFamily.RichText] = [],
        [HandoutKindFamily.Picture] = [HandoutMediaTypes.Png, HandoutMediaTypes.Jpeg, HandoutMediaTypes.WebP, HandoutMediaTypes.Gif],
        [HandoutKindFamily.Document] = [HandoutMediaTypes.Pdf],
    };

    public static HandoutKindFamily FamilyOf(HandoutKind kind) => Families[kind];

    /// <summary>True for Image, Document, and Map: the kinds that hold a stored file instead of content.</summary>
    public static bool IsFile(HandoutKind kind) => FamilyOf(kind) != HandoutKindFamily.RichText;

    public static bool AllowsMediaType(HandoutKind kind, string mediaType) => MediaTypesByFamily[FamilyOf(kind)].Contains(mediaType);
}
