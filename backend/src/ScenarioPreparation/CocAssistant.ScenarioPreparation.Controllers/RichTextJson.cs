namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>Turns stored Lexical JSON text back into a nested JSON value for a response (ADR 0015).</summary>
internal static class RichTextJson
{
    /// <summary>The stored document as a JSON element, or null when there is none.</summary>
    public static JsonElement? Parse(string? storedJson)
    {
        if (storedJson is null)
        {
            return null;
        }

        using var document = JsonDocument.Parse(storedJson);
        return document.RootElement.Clone();
    }
}
