namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The allowed Lexical nodes as a table from node type to its rule (ADR 0015 amendment). Mirrors the frontend list in
/// frontend/src/shared/services/richText.ts; specs/scenario-preparation/rich-text-fixtures.json is the shared definition.
/// </summary>
public static class RichTextNodeRules
{
    private const int AllowedFormatBits = 1 | 2 | 4 | 8;

    private static readonly HashSet<string> Inline = ["text", "link", "linebreak"];

    public static IReadOnlyDictionary<string, RichTextNodeRule> ByType { get; } = new Dictionary<string, RichTextNodeRule>
    {
        ["root"] = new(new HashSet<string> { "paragraph", "heading", "quote", "list" }, _ => true),
        ["paragraph"] = new(Inline, _ => true),
        ["heading"] = new(Inline, node => StringIsOneOf(node, "tag", "h3", "h4")),
        ["quote"] = new(Inline, _ => true),
        ["list"] = new(new HashSet<string> { "listitem" }, node => StringIsOneOf(node, "listType", "bullet", "number")),
        ["listitem"] = new(new HashSet<string> { "text", "link", "linebreak", "list" }, _ => true),
        ["link"] = new(new HashSet<string> { "text", "linebreak" }, LinkIsValid),
        ["text"] = new(new HashSet<string>(), TextIsValid, IsLeaf: true),
        ["linebreak"] = new(new HashSet<string>(), _ => true, IsLeaf: true),
    };

    /// <summary>True for an absolute http or https address with a host.</summary>
    public static bool IsAllowedLinkUrl(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && uri.Host.Length > 0;

    private static bool StringIsOneOf(JsonElement node, string property, params string[] allowed) =>
        node.TryGetProperty(property, out var value)
        && value.ValueKind == JsonValueKind.String
        && allowed.Contains(value.GetString());

    private static bool LinkIsValid(JsonElement node) =>
        node.TryGetProperty("url", out var url)
        && url.ValueKind == JsonValueKind.String
        && IsAllowedLinkUrl(url.GetString())
        && StringIsOneOf(node, "target", "_blank")
        && StringIsOneOf(node, "rel", "noopener noreferrer");

    private static bool TextIsValid(JsonElement node) => FormatIsAllowed(node) && StyleIsEmpty(node);

    private static bool FormatIsAllowed(JsonElement node)
    {
        if (!node.TryGetProperty("format", out var format))
        {
            return true;
        }

        return format.ValueKind == JsonValueKind.Number
            && format.TryGetInt32(out var bits)
            && bits >= 0
            && (bits & ~AllowedFormatBits) == 0;
    }

    private static bool StyleIsEmpty(JsonElement node) =>
        !node.TryGetProperty("style", out var style)
        || (style.ValueKind == JsonValueKind.String && style.GetString() == string.Empty);
}
