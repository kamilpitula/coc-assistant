namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// The stored file of an Image, Document, or Map Handout: the blob key, the display name, the detected media type
/// (empty when the bytes matched no allowed type), and the size in bytes.
/// </summary>
public sealed record HandoutFile(string Key, string Name, string MediaType, long SizeBytes);

/// <summary>The result of editing a file Handout: the Handout when accepted, and the blob key to delete once the change is committed.</summary>
public sealed record HandoutFileEditResult(HandoutOutcome Outcome, Handout? Handout, string? ReplacedKey);
