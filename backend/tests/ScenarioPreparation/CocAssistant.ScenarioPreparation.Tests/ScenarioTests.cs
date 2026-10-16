namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Creating and editing a Scenario: trimmed, bounded Title and Keeper notes (specs/scenario-preparation/spec.md).</summary>
public class ScenarioTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Given_a_title_and_notes_with_surrounding_whitespace_When_creating_Then_both_are_trimmed_and_the_position_is_kept()
    {
        var creation = Scenario.Create(CampaignId, "  The Haunting  ", "\n Cellar key under the stairs. \t", 3, Now);

        Assert.Equal(ScenarioFieldsOutcome.Accepted, creation.Outcome);
        var scenario = Assert.IsType<Scenario>(creation.Scenario);
        Assert.Equal(
            ("The Haunting", "Cellar key under the stairs.", 3, CampaignId, Now),
            (scenario.Title, scenario.KeeperNotes, scenario.Position, scenario.CampaignId, scenario.CreatedAt));
        Assert.NotEqual(Guid.Empty, scenario.Id);
    }

    [Fact]
    public void Given_no_notes_When_creating_Then_the_notes_are_an_empty_string()
    {
        var scenario = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario;

        Assert.Equal(string.Empty, scenario!.KeeperNotes);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   \t ")]
    public void Given_an_empty_or_whitespace_title_When_creating_Then_it_is_refused_with_no_scenario(string title)
    {
        var creation = Scenario.Create(CampaignId, title, "notes", 1, Now);

        Assert.Equal(ScenarioFieldsOutcome.InvalidTitle, creation.Outcome);
        Assert.Null(creation.Scenario);
    }

    [Fact]
    public void Given_titles_around_the_limit_When_creating_Then_200_characters_are_accepted_and_201_refused()
    {
        var accepted = Scenario.Create(CampaignId, new string('a', 200), null, 1, Now);
        var refused = Scenario.Create(CampaignId, new string('a', 201), null, 1, Now);

        Assert.Equal(200, Scenario.TitleMaxLength);
        Assert.Equal(ScenarioFieldsOutcome.Accepted, accepted.Outcome);
        Assert.Equal(ScenarioFieldsOutcome.InvalidTitle, refused.Outcome);
    }

    [Fact]
    public void Given_notes_around_the_limit_When_creating_Then_10000_characters_are_accepted_and_10001_refused()
    {
        var accepted = Scenario.Create(CampaignId, "T", new string('n', 10_000), 1, Now);
        var refused = Scenario.Create(CampaignId, "T", new string('n', 10_001), 1, Now);

        Assert.Equal(10_000, Scenario.KeeperNotesMaxLength);
        Assert.Equal(ScenarioFieldsOutcome.Accepted, accepted.Outcome);
        Assert.Equal(ScenarioFieldsOutcome.InvalidKeeperNotes, refused.Outcome);
        Assert.Null(refused.Scenario);
    }

    [Fact]
    public void Given_a_scenario_When_editing_with_valid_values_Then_title_and_notes_change_and_the_position_does_not()
    {
        var scenario = Scenario.Create(CampaignId, "The Haunting", "old", 4, Now).Scenario!;

        var outcome = scenario.Edit("  Edge of Darkness ", " new ");

        Assert.Equal(ScenarioFieldsOutcome.Accepted, outcome);
        Assert.Equal(("Edge of Darkness", "new", 4), (scenario.Title, scenario.KeeperNotes, scenario.Position));
    }

    [Theory]
    [InlineData("  ", "new", ScenarioFieldsOutcome.InvalidTitle)]
    [InlineData("New title", "", ScenarioFieldsOutcome.Accepted)]
    public void Given_a_scenario_When_editing_Then_the_same_title_rule_applies_and_empty_notes_are_allowed(
        string title, string notes, ScenarioFieldsOutcome expected)
    {
        var scenario = Scenario.Create(CampaignId, "The Haunting", "old", 1, Now).Scenario!;

        Assert.Equal(expected, scenario.Edit(title, notes));
    }

    [Fact]
    public void Given_a_scenario_When_an_edit_is_refused_Then_the_scenario_is_unchanged()
    {
        var scenario = Scenario.Create(CampaignId, "The Haunting", "old", 2, Now).Scenario!;

        var tooLongTitle = scenario.Edit(new string('a', 201), "changed");
        var tooLongNotes = scenario.Edit("Changed", new string('n', 10_001));

        Assert.Equal([ScenarioFieldsOutcome.InvalidTitle, ScenarioFieldsOutcome.InvalidKeeperNotes], [tooLongTitle, tooLongNotes]);
        Assert.Equal(("The Haunting", "old", 2), (scenario.Title, scenario.KeeperNotes, scenario.Position));
    }
}
