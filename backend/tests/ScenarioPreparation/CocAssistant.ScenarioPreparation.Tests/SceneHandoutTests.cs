namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Adding, editing, removing, and reordering Handouts on a Scene (PBI-SP-005, specs/scenario-preparation/spec.md).</summary>
public class SceneHandoutTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\",\"format\":1}]}]}}";
    private const string OtherText = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A cold draught\"}]}]}}";
    private const string EmptyParagraph = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[]}]}}";
    private const string Image = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now);
        return scene;
    }

    private static Scene FinishedScene()
    {
        var scene = ActiveScene();
        scene.Finish(Now.AddHours(1));
        return scene;
    }

    private static Scene SceneOfStatus(SceneStatus status) => status switch
    {
        SceneStatus.Prepared => PreparedScene(),
        SceneStatus.Active => ActiveScene(),
        _ => FinishedScene(),
    };

    private static Handout Add(Scene scene, string title = "The cellar", HandoutKind kind = HandoutKind.ReadAloud, HandoutVisibility visibility = HandoutVisibility.PlayerFacing, DateTimeOffset? at = null) =>
        scene.AddHandout(kind, visibility, title, Text, at ?? Now).Handout!;

    private static (Guid Id, HandoutKind Kind, HandoutVisibility Visibility, string Title, string Content, int Position)[] Snapshot(Scene scene) =>
        scene.Handouts.Select(handout => (handout.Id, handout.Kind, handout.Visibility, handout.Title, handout.Content, handout.Position)).ToArray();

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_prepared_or_active_scene_When_adding_Then_a_handout_with_a_new_id_the_trimmed_title_and_position_1_is_added(SceneStatus status)
    {
        var scene = SceneOfStatus(status);

        var result = scene.AddHandout(HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "  The cellar \t", Text, Now);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        var handout = Assert.IsType<Handout>(result.Handout);
        Assert.NotEqual(Guid.Empty, handout.Id);
        Assert.Equal(
            (scene.Id, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "The cellar", Text, 1, Now),
            (handout.SceneId, handout.Kind, handout.Visibility, handout.Title, handout.Content, handout.Position, handout.CreatedAt));
        Assert.Same(handout, Assert.Single(scene.Handouts));
    }

    [Fact]
    public void Given_two_read_aloud_handouts_When_adding_Then_they_stay_in_the_order_added_each_with_its_own_visibility()
    {
        var scene = PreparedScene();

        var first = Add(scene, "Arrival", visibility: HandoutVisibility.PlayerFacing);
        var second = Add(scene, "Secret door", visibility: HandoutVisibility.KeeperFacing, at: Now.AddMinutes(1));

        Assert.Equal([first.Id, second.Id], scene.Handouts.Select(handout => handout.Id));
        Assert.Equal([1, 2], scene.Handouts.Select(handout => handout.Position));
        Assert.Equal([HandoutVisibility.PlayerFacing, HandoutVisibility.KeeperFacing], scene.Handouts.Select(handout => handout.Visibility));
    }

    [Fact]
    public void Given_a_gap_in_the_positions_When_adding_Then_the_new_handout_goes_after_the_highest_position()
    {
        var scene = PreparedScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));
        scene.RemoveHandout(first.Id);

        var third = Add(scene, "Third", at: Now.AddMinutes(2));

        Assert.Equal([2, 3], [second.Position, third.Position]);
    }

    [Fact]
    public void Given_a_finished_scene_When_adding_Then_it_is_refused_before_any_field_check_and_nothing_changes()
    {
        var scene = FinishedScene();

        var result = scene.AddHandout(null, null, string.Empty, null, Now);

        Assert.Equal(HandoutOutcome.SceneFinished, result.Outcome);
        Assert.Null(result.Handout);
        Assert.Empty(scene.Handouts);
    }

    [Fact]
    public void Given_invalid_fields_When_adding_Then_the_first_failing_rule_in_field_order_wins_and_nothing_changes()
    {
        var scene = PreparedScene();

        Assert.Equal(HandoutOutcome.InvalidTitle, scene.AddHandout(null, null, "   ", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidTitle, scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, new string('a', 201), Text, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.AddHandout(null, null, "Title", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidVisibility, scene.AddHandout(HandoutKind.Text, null, "Title", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.MissingContent, scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidContent, scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", Image, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidContent, scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", "{not json", Now).Outcome);
        Assert.Equal(HandoutOutcome.MissingContent, scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", EmptyParagraph, Now).Outcome);
        Assert.Empty(scene.Handouts);
    }

    [Fact]
    public void Given_a_title_of_200_characters_When_adding_Then_it_is_accepted()
    {
        var result = PreparedScene().AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, new string('a', 200), Text, Now);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_handout_When_editing_it_Then_the_fields_are_replaced_and_the_position_is_kept(SceneStatus status)
    {
        var scene = SceneOfStatus(status);
        Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));

        var result = scene.EditHandout(second.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, " Renamed ", OtherText);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Same(second, result.Handout);
        Assert.Equal(
            (HandoutKind.Text, HandoutVisibility.KeeperFacing, "Renamed", OtherText, 2),
            (second.Kind, second.Visibility, second.Title, second.Content, second.Position));
    }

    [Fact]
    public void Given_a_handout_When_editing_the_kind_Then_it_can_switch_both_ways_between_read_aloud_and_text()
    {
        var scene = PreparedScene();
        var handout = Add(scene, kind: HandoutKind.Text);

        scene.EditHandout(handout.Id, HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "The cellar", Text);
        Assert.Equal(HandoutKind.ReadAloud, handout.Kind);

        scene.EditHandout(handout.Id, HandoutKind.Text, HandoutVisibility.PlayerFacing, "The cellar", Text);
        Assert.Equal(HandoutKind.Text, handout.Kind);
    }

    [Fact]
    public void Given_a_finished_scene_When_editing_Then_it_is_refused_before_the_handout_and_the_fields_are_checked()
    {
        var scene = FinishedScene();

        var result = scene.EditHandout(Guid.NewGuid(), null, null, string.Empty, null);

        Assert.Equal(HandoutOutcome.SceneFinished, result.Outcome);
    }

    [Fact]
    public void Given_an_unknown_handout_id_When_editing_Then_it_is_not_found_before_the_fields_are_checked()
    {
        var scene = PreparedScene();
        Add(scene);

        var result = scene.EditHandout(Guid.NewGuid(), null, null, string.Empty, null);

        Assert.Equal(HandoutOutcome.HandoutNotFound, result.Outcome);
        Assert.Null(result.Handout);
    }

    [Fact]
    public void Given_invalid_fields_When_editing_Then_each_rule_returns_its_outcome_in_field_order_and_nothing_changes()
    {
        var scene = PreparedScene();
        var handout = Add(scene);
        var before = Snapshot(scene);

        Assert.Equal(HandoutOutcome.InvalidTitle, scene.EditHandout(handout.Id, null, null, " ", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.EditHandout(handout.Id, null, null, "Title", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidVisibility, scene.EditHandout(handout.Id, HandoutKind.Text, null, "Title", null).Outcome);
        Assert.Equal(HandoutOutcome.MissingContent, scene.EditHandout(handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidContent, scene.EditHandout(handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", Image).Outcome);
        Assert.Equal(HandoutOutcome.MissingContent, scene.EditHandout(handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "Title", EmptyParagraph).Outcome);
        Assert.Equal(before, Snapshot(scene));
    }

    [Fact]
    public void Given_a_prepared_scene_When_removing_a_handout_Then_it_is_removed_and_the_others_keep_their_positions()
    {
        var scene = PreparedScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));

        var outcome = scene.RemoveHandout(first.Id);

        Assert.Equal(HandoutRemovalOutcome.Removed, outcome);
        Assert.Same(second, Assert.Single(scene.Handouts));
        Assert.Equal(2, second.Position);
    }

    [Fact]
    public void Given_a_prepared_scene_When_removing_an_unknown_handout_Then_it_is_not_found()
    {
        var scene = PreparedScene();
        Add(scene);

        Assert.Equal(HandoutRemovalOutcome.HandoutNotFound, scene.RemoveHandout(Guid.NewGuid()));
        Assert.Single(scene.Handouts);
    }

    [Theory]
    [InlineData(SceneStatus.Active)]
    [InlineData(SceneStatus.Finished)]
    public void Given_an_active_or_finished_scene_When_removing_a_handout_Then_it_is_refused_even_for_an_unknown_id(SceneStatus status)
    {
        var scene = PreparedScene();
        var handout = Add(scene);
        scene.Start(Now);
        if (status == SceneStatus.Finished)
        {
            scene.Finish(Now.AddHours(1));
        }

        Assert.Equal(HandoutRemovalOutcome.SceneNotPrepared, scene.RemoveHandout(handout.Id));
        Assert.Equal(HandoutRemovalOutcome.SceneNotPrepared, scene.RemoveHandout(Guid.NewGuid()));
        Assert.Single(scene.Handouts);
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_three_handouts_When_reordering_with_a_permutation_Then_positions_follow_the_request_from_1(SceneStatus status)
    {
        var scene = PreparedScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));
        var third = Add(scene, "Third", at: Now.AddMinutes(2));
        if (status == SceneStatus.Active)
        {
            scene.Start(Now);
        }

        var outcome = scene.ReorderHandouts([third.Id, first.Id, second.Id]);

        Assert.Equal(HandoutOrderOutcome.Reordered, outcome);
        Assert.Equal([2, 3, 1], [first.Position, second.Position, third.Position]);
        Assert.Equal([third.Id, first.Id, second.Id], scene.Handouts.Select(handout => handout.Id));
    }

    [Fact]
    public void Given_a_finished_scene_When_reordering_Then_it_is_refused_before_the_ids_are_checked()
    {
        var scene = PreparedScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));
        scene.Start(Now);
        scene.Finish(Now.AddHours(1));

        Assert.Equal(HandoutOrderOutcome.SceneFinished, scene.ReorderHandouts([second.Id, second.Id]));
        Assert.Equal(HandoutOrderOutcome.SceneFinished, scene.ReorderHandouts([second.Id, first.Id]));
        Assert.Equal([1, 2], [first.Position, second.Position]);
    }

    [Fact]
    public void Given_duplicate_missing_foreign_or_extra_ids_When_reordering_Then_nothing_changes_and_the_outcome_names_the_rule()
    {
        var scene = PreparedScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));
        var before = Snapshot(scene);

        Assert.Equal(HandoutOrderOutcome.DuplicateIds, scene.ReorderHandouts([first.Id, first.Id]));
        Assert.Equal(HandoutOrderOutcome.DoesNotMatchHandouts, scene.ReorderHandouts([first.Id]));
        Assert.Equal(HandoutOrderOutcome.DoesNotMatchHandouts, scene.ReorderHandouts([first.Id, Guid.NewGuid()]));
        Assert.Equal(HandoutOrderOutcome.DoesNotMatchHandouts, scene.ReorderHandouts([second.Id, first.Id, Guid.NewGuid()]));
        Assert.Equal(before, Snapshot(scene));
    }

    [Fact]
    public void Given_handouts_added_with_later_creation_times_first_When_reading_Then_they_follow_the_position_not_the_time()
    {
        var scene = PreparedScene();
        var later = Add(scene, "Later", at: Now.AddMinutes(5));
        var earlier = Add(scene, "Earlier", at: Now);

        Assert.Equal([later.Id, earlier.Id], scene.Handouts.Select(handout => handout.Id));
    }

    [Fact]
    public void Given_a_handout_When_editing_Then_the_scene_status_and_other_handouts_are_untouched()
    {
        var scene = ActiveScene();
        var first = Add(scene, "First");
        var second = Add(scene, "Second", at: Now.AddMinutes(1));

        scene.EditHandout(first.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "First!", OtherText);

        Assert.Equal(SceneStatus.Active, scene.Status);
        Assert.Equal(("Second", 2), (second.Title, second.Position));
    }
}
