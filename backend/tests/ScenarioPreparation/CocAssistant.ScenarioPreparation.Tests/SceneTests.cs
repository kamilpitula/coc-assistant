namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Creating and editing a Scene, its status transitions, and removal (specs/scenario-preparation/spec.md).</summary>
public class SceneTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddHours(1);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar\",\"format\":1}]}]}}";

    private static Scene PreparedScene(string title = "The Corbitt House") =>
        Scene.Create(TheHaunting, title, "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now);
        return scene;
    }

    private static Scene FinishedScene()
    {
        var scene = ActiveScene();
        scene.Finish(Later);
        return scene;
    }

    [Fact]
    public void Given_a_title_and_location_with_whitespace_When_creating_Then_both_are_trimmed_and_the_scene_is_prepared_at_the_given_position()
    {
        var creation = Scene.Create(TheHaunting, "  The Corbitt House ", " Arkham, Boston Road\t", Notes, 3, Now);

        Assert.Equal(SceneFieldsOutcome.Accepted, creation.Outcome);
        var scene = Assert.IsType<Scene>(creation.Scene);
        Assert.Equal(
            ("The Corbitt House", "Arkham, Boston Road", Notes, 3, SceneStatus.Prepared, Now),
            (scene.Title, scene.Location, scene.KeeperNotes, scene.Position, scene.Status, scene.CreatedAt));
        Assert.Null(scene.StartedAt);
        Assert.Null(scene.FinishedAt);
        Assert.NotEqual(Guid.Empty, scene.Id);
    }

    [Fact]
    public void Given_a_scenario_When_creating_a_scene_Then_it_copies_the_campaign_and_scenario_ids()
    {
        var scene = PreparedScene();

        Assert.Equal((TheHaunting.CampaignId, TheHaunting.Id), (scene.CampaignId, scene.ScenarioId));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  \t ")]
    public void Given_an_empty_or_whitespace_title_When_creating_Then_it_is_refused(string title)
    {
        var creation = Scene.Create(TheHaunting, title, null, null, 1, Now);

        Assert.Equal(SceneFieldsOutcome.InvalidTitle, creation.Outcome);
        Assert.Null(creation.Scene);
    }

    [Fact]
    public void Given_titles_at_and_over_the_limit_When_creating_Then_200_is_accepted_and_201_is_refused()
    {
        Assert.Equal(SceneFieldsOutcome.Accepted, Scene.Create(TheHaunting, new string('t', 200), null, null, 1, Now).Outcome);
        Assert.Equal(SceneFieldsOutcome.InvalidTitle, Scene.Create(TheHaunting, new string('t', 201), null, null, 1, Now).Outcome);
    }

    [Fact]
    public void Given_locations_at_and_over_the_limit_When_creating_Then_200_is_accepted_and_201_is_refused()
    {
        Assert.Equal(SceneFieldsOutcome.Accepted, Scene.Create(TheHaunting, "T", new string('l', 200), null, 1, Now).Outcome);
        Assert.Equal(SceneFieldsOutcome.InvalidLocation, Scene.Create(TheHaunting, "T", new string('l', 201), null, 1, Now).Outcome);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_no_location_When_creating_Then_it_is_stored_as_an_empty_string(string? location)
    {
        Assert.Equal(string.Empty, Scene.Create(TheHaunting, "T", location, null, 1, Now).Scene!.Location);
    }

    [Fact]
    public void Given_notes_with_a_disallowed_node_When_creating_Then_the_notes_are_refused()
    {
        const string image = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

        var creation = Scene.Create(TheHaunting, "T", null, image, 1, Now);

        Assert.Equal(SceneFieldsOutcome.InvalidKeeperNotes, creation.Outcome);
        Assert.Null(creation.Scene);
    }

    [Fact]
    public void Given_no_notes_When_creating_Then_the_scene_has_null_notes()
    {
        Assert.Null(PreparedScene().KeeperNotes);
    }

    [Fact]
    public void Given_a_prepared_scene_When_editing_Then_the_fields_are_replaced_and_position_is_kept()
    {
        var scene = PreparedScene();

        var outcome = scene.Edit(" New title ", " Elsewhere ", Notes);

        Assert.Equal(SceneFieldsOutcome.Accepted, outcome);
        Assert.Equal(("New title", "Elsewhere", Notes, 1), (scene.Title, scene.Location, scene.KeeperNotes, scene.Position));
    }

    [Fact]
    public void Given_an_active_scene_When_editing_Then_the_edit_is_accepted()
    {
        var scene = ActiveScene();

        Assert.Equal(SceneFieldsOutcome.Accepted, scene.Edit("Changed", null, null));
        Assert.Equal("Changed", scene.Title);
    }

    [Fact]
    public void Given_a_finished_scene_When_editing_with_valid_or_invalid_fields_Then_it_is_finished_and_nothing_changes()
    {
        var scene = FinishedScene();

        Assert.Equal(SceneFieldsOutcome.SceneFinished, scene.Edit("Changed", "Somewhere", Notes));
        Assert.Equal(SceneFieldsOutcome.SceneFinished, scene.Edit("", null, null));
        Assert.Equal(("The Corbitt House", "Arkham", (string?)null), (scene.Title, scene.Location, scene.KeeperNotes));
    }

    [Fact]
    public void Given_a_refused_edit_When_editing_Then_nothing_changes()
    {
        var scene = PreparedScene();

        Assert.Equal(SceneFieldsOutcome.InvalidTitle, scene.Edit("", "Elsewhere", Notes));
        Assert.Equal(SceneFieldsOutcome.InvalidKeeperNotes, scene.Edit("New", "Elsewhere", "{}"));
        Assert.Equal(("The Corbitt House", "Arkham", (string?)null), (scene.Title, scene.Location, scene.KeeperNotes));
    }

    [Fact]
    public void Given_a_prepared_scene_When_started_Then_it_is_active_with_a_start_time()
    {
        var scene = PreparedScene();

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.Start(Now));
        Assert.Equal((SceneStatus.Active, (DateTimeOffset?)Now, (DateTimeOffset?)null), (scene.Status, scene.StartedAt, scene.FinishedAt));
    }

    [Fact]
    public void Given_an_active_scene_When_finished_Then_it_is_finished_with_a_finish_time()
    {
        var scene = ActiveScene();

        Assert.Equal(SceneTransitionOutcome.Transitioned, scene.Finish(Later));
        Assert.Equal((SceneStatus.Finished, (DateTimeOffset?)Now, (DateTimeOffset?)Later), (scene.Status, scene.StartedAt, scene.FinishedAt));
    }

    [Fact]
    public void Given_a_scene_in_the_wrong_status_When_transitioning_Then_the_transition_is_refused_and_nothing_changes()
    {
        var prepared = PreparedScene();
        Assert.Equal(SceneTransitionOutcome.NotAllowed, prepared.Finish(Later));
        Assert.Equal((SceneStatus.Prepared, (DateTimeOffset?)null), (prepared.Status, prepared.FinishedAt));

        var active = ActiveScene();
        Assert.Equal(SceneTransitionOutcome.NotAllowed, active.Start(Later));
        Assert.Equal((SceneStatus.Active, (DateTimeOffset?)Now), (active.Status, active.StartedAt));

        var finished = FinishedScene();
        Assert.Equal(SceneTransitionOutcome.NotAllowed, finished.Start(Later.AddHours(1)));
        Assert.Equal(SceneTransitionOutcome.NotAllowed, finished.Finish(Later.AddHours(1)));
        Assert.Equal((SceneStatus.Finished, (DateTimeOffset?)Now, (DateTimeOffset?)Later), (finished.Status, finished.StartedAt, finished.FinishedAt));
    }

    [Fact]
    public void Given_each_status_When_asking_if_removable_Then_only_a_prepared_scene_is()
    {
        Assert.True(PreparedScene().IsRemovable);
        Assert.False(ActiveScene().IsRemovable);
        Assert.False(FinishedScene().IsRemovable);
    }
}
