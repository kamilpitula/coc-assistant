namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Handout as listed on its Scene: no content, no file, and no Position; clients use list order (specs/scenario-preparation/spec.md).</summary>
public sealed record HandoutSummaryView(Guid Id, HandoutKind Kind, HandoutVisibility Visibility, string Title);

/// <summary>The details of a Handout's stored file; the blob key stays inside the application.</summary>
public sealed record HandoutFileView(string Name, string MediaType, long SizeBytes);

/// <summary>A Handout with its content (the stored Lexical JSON text) or its file details; exactly one is set.</summary>
public sealed record HandoutView(Guid Id, HandoutKind Kind, HandoutVisibility Visibility, string Title, string? Content, HandoutFileView? File = null);

/// <summary>Maps Handouts to the views that leave the application layer.</summary>
internal static class HandoutViews
{
    public static HandoutSummaryView ToSummary(Handout handout) => new(handout.Id, handout.Kind, handout.Visibility, handout.Title);

    public static HandoutView ToView(Handout handout) =>
        new(handout.Id, handout.Kind, handout.Visibility, handout.Title, handout.Content, handout.File is { } file ? new HandoutFileView(file.Name, file.MediaType, file.SizeBytes) : null);
}
