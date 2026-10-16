namespace CocAssistant.ScenarioPreparation.Domain;

/// <summary>
/// One of a Campaign's ordered Scenarios (CONTEXT.md, Scenario). It references its Campaign by id only (ADR 0013)
/// and holds its place in the Campaign's order as Position, which is never exposed to clients (ADR 0014).
/// </summary>
public class Scenario
{
    public const int TitleMaxLength = 200;
    public const int KeeperNotesMaxLength = 10_000;

    public Guid Id { get; private set; }
    public Guid CampaignId { get; private set; }
    public string Title { get; private set; }
    public string KeeperNotes { get; private set; }
    public int Position { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private Scenario()
    {
        Title = string.Empty;
        KeeperNotes = string.Empty;
    }

    private Scenario(Guid campaignId, string title, string keeperNotes, int position, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        CampaignId = campaignId;
        Title = title;
        KeeperNotes = keeperNotes;
        Position = position;
        CreatedAt = createdAt;
    }

    /// <summary>Creates a Scenario at the given position, or refuses a Title or Keeper notes outside their limits.</summary>
    public static ScenarioCreation Create(Guid campaignId, string title, string? keeperNotes, int position, DateTimeOffset now)
    {
        var outcome = Validate(title, keeperNotes, out var trimmedTitle, out var trimmedNotes);
        return outcome == ScenarioFieldsOutcome.Accepted
            ? new ScenarioCreation(outcome, new Scenario(campaignId, trimmedTitle, trimmedNotes, position, now))
            : new ScenarioCreation(outcome, null);
    }

    /// <summary>Replaces the Title and Keeper notes under the creation rules; a refused edit changes nothing. Never touches Position.</summary>
    public ScenarioFieldsOutcome Edit(string title, string? keeperNotes)
    {
        var outcome = Validate(title, keeperNotes, out var trimmedTitle, out var trimmedNotes);
        if (outcome == ScenarioFieldsOutcome.Accepted)
        {
            Title = trimmedTitle;
            KeeperNotes = trimmedNotes;
        }

        return outcome;
    }

    /// <summary>Sets the place in the Campaign's order; only <see cref="ScenarioOrder"/> reorders.</summary>
    internal void MoveTo(int position) => Position = position;

    private static ScenarioFieldsOutcome Validate(string title, string? keeperNotes, out string trimmedTitle, out string trimmedNotes)
    {
        trimmedTitle = title.Trim();
        trimmedNotes = keeperNotes?.Trim() ?? string.Empty;
        if (trimmedTitle.Length is 0 or > TitleMaxLength)
        {
            return ScenarioFieldsOutcome.InvalidTitle;
        }

        return trimmedNotes.Length > KeeperNotesMaxLength ? ScenarioFieldsOutcome.InvalidKeeperNotes : ScenarioFieldsOutcome.Accepted;
    }
}
