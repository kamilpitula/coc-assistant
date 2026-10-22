namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Small file contents for tests, built from base64 so the repository holds no binary fixtures.</summary>
public static class HandoutFileSamples
{
    /// <summary>A valid 1x1 PNG.</summary>
    public static byte[] Png() => Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    /// <summary>The first bytes of a JPEG; enough for signature detection.</summary>
    public static byte[] Jpeg() => [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];

    public static byte[] Gif() => Convert.FromBase64String("R0lGODlhAQABAAAAACw=");

    /// <summary>RIFF, a four-byte size, then WEBP.</summary>
    public static byte[] WebP() => "RIFF\u0004\0\0\0WEBPVP8 "u8.ToArray();

    public static byte[] Pdf() => "%PDF-1.4\n1 0 obj\n<< >>\nendobj\ntrailer\n<< >>\n%%EOF\n"u8.ToArray();

    public static byte[] Svg() => "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"u8.ToArray();

    public static byte[] OfSize(byte[] start, int length)
    {
        var bytes = new byte[length];
        start.CopyTo(bytes, 0);
        return bytes;
    }
}
