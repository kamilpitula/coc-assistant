namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Applying a requested order to a Campaign's Scenarios (ADR 0014): all or nothing, renumbered 1..n.</summary>
public class ScenarioOrderTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    private static Scenario ScenarioAt(string title, int position) => Scenario.Create(CampaignId, title, null, position, Now).Scenario!;

    [Fact]
    public void Given_three_scenarios_When_applying_a_permutation_Then_positions_follow_the_requested_order_from_1()
    {
        var first = ScenarioAt("First", 1);
        var second = ScenarioAt("Second", 2);
        var third = ScenarioAt("Third", 3);

        var outcome = ScenarioOrder.Apply([first, second, third], [third.Id, first.Id, second.Id]);

        Assert.Equal(ScenarioOrderOutcome.Reordered, outcome);
        Assert.Equal([2, 3, 1], [first.Position, second.Position, third.Position]);
    }

    [Fact]
    public void Given_scenarios_with_duplicate_starting_positions_When_applying_an_order_Then_they_are_renumbered_1_to_n()
    {
        var first = ScenarioAt("First", 2);
        var second = ScenarioAt("Second", 2);
        var third = ScenarioAt("Third", 5);

        ScenarioOrder.Apply([first, second, third], [first.Id, second.Id, third.Id]);

        Assert.Equal([1, 2, 3], [first.Position, second.Position, third.Position]);
    }

    [Fact]
    public void Given_a_request_with_a_duplicate_id_When_applying_Then_it_is_refused_and_positions_are_untouched()
    {
        var first = ScenarioAt("First", 1);
        var second = ScenarioAt("Second", 2);

        var outcome = ScenarioOrder.Apply([first, second], [first.Id, first.Id]);

        Assert.Equal(ScenarioOrderOutcome.DuplicateIds, outcome);
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }

    [Fact]
    public void Given_a_request_missing_a_scenario_When_applying_Then_it_does_not_match_and_positions_are_untouched()
    {
        var first = ScenarioAt("First", 1);
        var second = ScenarioAt("Second", 2);

        var outcome = ScenarioOrder.Apply([first, second], [second.Id]);

        Assert.Equal(ScenarioOrderOutcome.DoesNotMatchScenarios, outcome);
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }

    [Fact]
    public void Given_a_request_with_an_extra_or_foreign_id_When_applying_Then_it_does_not_match_and_positions_are_untouched()
    {
        var first = ScenarioAt("First", 1);
        var second = ScenarioAt("Second", 2);

        var extra = ScenarioOrder.Apply([first, second], [first.Id, second.Id, Guid.NewGuid()]);
        var foreign = ScenarioOrder.Apply([first, second], [first.Id, Guid.NewGuid()]);

        Assert.Equal([ScenarioOrderOutcome.DoesNotMatchScenarios, ScenarioOrderOutcome.DoesNotMatchScenarios], [extra, foreign]);
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }

    [Fact]
    public void Given_no_scenarios_When_applying_an_empty_order_Then_it_is_reordered()
    {
        Assert.Equal(ScenarioOrderOutcome.Reordered, ScenarioOrder.Apply([], []));
    }
}
