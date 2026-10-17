namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>What one Lexical node type may contain and which of its properties must hold a given value (ADR 0015).</summary>
/// <param name="AllowedChildTypes">Node types allowed directly inside it; empty for a leaf.</param>
/// <param name="PropertiesAreValid">Checks the node's own security- and meaning-relevant properties.</param>
/// <param name="IsLeaf">True when the node must not hold children.</param>
public sealed record RichTextNodeRule(IReadOnlySet<string> AllowedChildTypes, Func<JsonElement, bool> PropertiesAreValid, bool IsLeaf = false);
