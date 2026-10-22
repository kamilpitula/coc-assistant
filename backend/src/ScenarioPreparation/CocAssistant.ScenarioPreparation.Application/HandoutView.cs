namespace CocAssistant.ScenarioPreparation.Application;

/// <summary>A Handout as listed on its Scene: no content and no Position; clients use list order (specs/scenario-preparation/spec.md).</summary>
public sealed record HandoutSummaryView(Guid Id, HandoutKind Kind, HandoutVisibility Visibility, string Title);

/// <summary>A Handout with its content, the stored Lexical JSON text.</summary>
public sealed record HandoutView(Guid Id, HandoutKind Kind, HandoutVisibility Visibility, string Title, string Content);

/// <summary>Maps Handouts to the views that leave the application layer.</summary>
internal static class HandoutViews
{
    public static HandoutSummaryView ToSummary(Handout handout) => new(handout.Id, handout.Kind, handout.Visibility, handout.Title);
}
