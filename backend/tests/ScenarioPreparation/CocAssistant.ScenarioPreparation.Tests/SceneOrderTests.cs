namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Applying a requested order to a Scenario's Scenes (ADR 0014): all or nothing, renumbered 1..n.</summary>
public class SceneOrderTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private static Scene SceneAt(string title, int position) => Scene.Create(TheHaunting, title, null, null, position, Now).Scene!;

    [Fact]
    public void Given_three_scenes_When_applying_a_permutation_Then_positions_follow_the_requested_order_from_1()
    {
        var first = SceneAt("First", 1);
        var second = SceneAt("Second", 2);
        var third = SceneAt("Third", 3);

        var outcome = SceneOrder.Apply([first, second, third], [third.Id, first.Id, second.Id]);

        Assert.Equal(SceneOrderOutcome.Reordered, outcome);
        Assert.Equal([2, 3, 1], [first.Position, second.Position, third.Position]);
    }

    [Fact]
    public void Given_scenes_with_duplicate_starting_positions_When_applying_an_order_Then_they_are_renumbered_1_to_n()
    {
        var first = SceneAt("First", 2);
        var second = SceneAt("Second", 2);
        var third = SceneAt("Third", 5);

        SceneOrder.Apply([first, second, third], [first.Id, second.Id, third.Id]);

        Assert.Equal([1, 2, 3], [first.Position, second.Position, third.Position]);
    }

    [Fact]
    public void Given_active_and_finished_scenes_When_applying_an_order_Then_they_move_too()
    {
        var prepared = SceneAt("Prepared", 1);
        var active = SceneAt("Active", 2);
        active.StartWithOneInvestigator(Now);
        var finished = SceneAt("Finished", 3);
        finished.StartWithOneInvestigator(Now);
        finished.Finish(Now);

        var outcome = SceneOrder.Apply([prepared, active, finished], [finished.Id, active.Id, prepared.Id]);

        Assert.Equal(SceneOrderOutcome.Reordered, outcome);
        Assert.Equal([3, 2, 1], [prepared.Position, active.Position, finished.Position]);
    }

    [Fact]
    public void Given_a_request_with_a_duplicate_id_When_applying_Then_it_is_refused_and_positions_are_untouched()
    {
        var first = SceneAt("First", 1);
        var second = SceneAt("Second", 2);

        var outcome = SceneOrder.Apply([first, second], [first.Id, first.Id]);

        Assert.Equal(SceneOrderOutcome.DuplicateIds, outcome);
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }

    [Fact]
    public void Given_a_request_missing_extra_or_foreign_ids_When_applying_Then_it_is_refused_and_positions_are_untouched()
    {
        var first = SceneAt("First", 1);
        var second = SceneAt("Second", 2);
        var foreign = SceneAt("Foreign", 1);

        Assert.Equal(SceneOrderOutcome.DoesNotMatchScenes, SceneOrder.Apply([first, second], [second.Id]));
        Assert.Equal(SceneOrderOutcome.DoesNotMatchScenes, SceneOrder.Apply([first, second], [second.Id, first.Id, foreign.Id]));
        Assert.Equal(SceneOrderOutcome.DoesNotMatchScenes, SceneOrder.Apply([first, second], [second.Id, foreign.Id]));
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }
}
