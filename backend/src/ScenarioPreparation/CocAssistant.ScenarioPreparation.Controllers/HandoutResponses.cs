namespace CocAssistant.ScenarioPreparation.Controllers;

/// <summary>A Handout as listed on its Scene: no content and no position; clients use list order.</summary>
public sealed record HandoutSummaryResponse(Guid Id, string Kind, string Visibility, string Title);

/// <summary>A Handout with its content, the stored Lexical document.</summary>
public sealed record HandoutResponse(Guid Id, string Kind, string Visibility, string Title, JsonElement? Content);

/// <summary>A Scene's Handouts in their stored order.</summary>
public sealed record HandoutListResponse(IReadOnlyList<HandoutSummaryResponse> Handouts);
