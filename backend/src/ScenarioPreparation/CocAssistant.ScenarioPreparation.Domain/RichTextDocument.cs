namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// Validates a Lexical serialized editor state against the allowed nodes (ADR 0015). It only reads the JSON; the caller
/// stores the validated text unchanged.
/// </summary>
public static class RichTextDocument
{
    /// <summary>200 KB as 204,800 bytes of UTF-8 in the JSON text as received.</summary>
    public const int MaxBytes = 204_800;

    public static RichTextOutcome Validate(string json)
    {
        if (Encoding.UTF8.GetByteCount(json) > MaxBytes)
        {
            return RichTextOutcome.TooLarge;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return ValidateRoot(document.RootElement);
        }
        catch (JsonException)
        {
            return RichTextOutcome.Malformed;
        }
    }

    private static RichTextOutcome ValidateRoot(JsonElement document)
    {
        if (document.ValueKind != JsonValueKind.Object
            || !document.TryGetProperty("root", out var root)
            || root.ValueKind != JsonValueKind.Object)
        {
            return RichTextOutcome.Malformed;
        }

        return NodeIsAllowed(root, "root") ? RichTextOutcome.Accepted : RichTextOutcome.DisallowedContent;
    }

    private static bool NodeIsAllowed(JsonElement node, string expectedType)
    {
        if (!TryReadType(node, out var type)
            || type != expectedType
            || !RichTextNodeRules.ByType.TryGetValue(expectedType, out var rule)
            || !rule.PropertiesAreValid(node))
        {
            return false;
        }

        return rule.IsLeaf ? HasNoChildren(node) : ChildrenAreAllowed(node, rule);
    }

    private static bool HasNoChildren(JsonElement node) =>
        !node.TryGetProperty("children", out var children)
        || (children.ValueKind == JsonValueKind.Array && children.GetArrayLength() == 0);

    private static bool ChildrenAreAllowed(JsonElement node, RichTextNodeRule rule)
    {
        if (!node.TryGetProperty("children", out var children) || children.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        foreach (var child in children.EnumerateArray())
        {
            if (!TryReadType(child, out var childType)
                || !rule.AllowedChildTypes.Contains(childType)
                || !NodeIsAllowed(child, childType))
            {
                return false;
            }
        }

        return true;
    }

    private static bool TryReadType(JsonElement node, out string type)
    {
        type = string.Empty;
        if (node.ValueKind != JsonValueKind.Object
            || !node.TryGetProperty("type", out var value)
            || value.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        type = value.GetString() ?? string.Empty;
        return true;
    }
}
