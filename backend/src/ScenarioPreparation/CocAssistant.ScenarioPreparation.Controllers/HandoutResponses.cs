namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>A Handout as listed on its Scene: no content and no position; clients use list order.</summary>
public sealed record HandoutSummaryResponse(Guid Id, string Kind, string Visibility, string Title);

/// <summary>The details of an Image, Document, or Map Handout's stored file; the file itself is served by the file endpoint.</summary>
public sealed record HandoutFileResponse(string Name, string MediaType, long SizeBytes);

/// <summary>A Handout with its content (the stored Lexical document) or its file; exactly one is not null.</summary>
public sealed record HandoutResponse(Guid Id, string Kind, string Visibility, string Title, JsonElement? Content, HandoutFileResponse? File);

/// <summary>A Scene's Handouts in their stored order.</summary>
public sealed record HandoutListResponse(IReadOnlyList<HandoutSummaryResponse> Handouts);
