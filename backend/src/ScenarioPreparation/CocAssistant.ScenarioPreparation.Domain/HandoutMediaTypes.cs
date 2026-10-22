namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Detects a Handout file's media type from its leading bytes alone, never from a client-supplied type or extension
/// (specs/scenario-preparation/spec.md, File storage). SVG is never detected.
/// </summary>
public static class HandoutMediaTypes
{
    public const string Png = "image/png";
    public const string Jpeg = "image/jpeg";
    public const string WebP = "image/webp";
    public const string Gif = "image/gif";
    public const string Pdf = "application/pdf";

    /// <summary>How many leading bytes <see cref="Detect"/> needs.</summary>
    public const int SignatureLength = 12;

    private sealed record Signature(string MediaType, params (int Offset, byte[] Bytes)[] Parts);

    private static readonly Signature[] Signatures =
    [
        new(Png, (0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
        new(Jpeg, (0, [0xFF, 0xD8, 0xFF])),
        new(Gif, (0, "GIF87a"u8.ToArray())),
        new(Gif, (0, "GIF89a"u8.ToArray())),
        new(WebP, (0, "RIFF"u8.ToArray()), (8, "WEBP"u8.ToArray())),
        new(Pdf, (0, "%PDF-"u8.ToArray())),
    ];

    /// <summary>The media type the bytes start with, or null when they match no allowed type.</summary>
    public static string? Detect(ReadOnlySpan<byte> leadingBytes)
    {
        foreach (var signature in Signatures)
        {
            if (Matches(leadingBytes, signature))
            {
                return signature.MediaType;
            }
        }

        return null;
    }

    private static bool Matches(ReadOnlySpan<byte> bytes, Signature signature)
    {
        foreach (var (offset, expected) in signature.Parts)
        {
            if (bytes.Length < offset + expected.Length || !bytes.Slice(offset, expected.Length).SequenceEqual(expected))
            {
                return false;
            }
        }

        return true;
    }
}
