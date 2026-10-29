namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Adding and editing Image, Document, and Map Handouts on a Scene (PBI-SP-007, specs/scenario-preparation/spec.md).</summary>
public class SceneFileHandoutTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";
    private const long MaxBytes = 20_971_520;

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene SceneOfStatus(SceneStatus status)
    {
        var scene = PreparedScene();
        if (status >= SceneStatus.Active)
        {
            scene.StartWithOneInvestigator(Now);
        }

        if (status == SceneStatus.Finished)
        {
            scene.Finish(Now.AddHours(1));
        }

        return scene;
    }

    private static HandoutFile PngFile(string key = "key1", long size = 68) => new(key, "plan.png", "image/png", size);

    private static HandoutFile PdfFile(string key = "key1") => new(key, "letter.pdf", "application/pdf", 1200);

    private static Handout AddImage(Scene scene, string title = "Floor plan") =>
        scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, title, PngFile(), Now).Handout!;

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_prepared_or_active_scene_When_adding_a_file_handout_Then_it_has_the_file_no_content_and_position_1(SceneStatus status)
    {
        var scene = SceneOfStatus(status);

        var result = scene.AddFileHandout(HandoutKind.Map, HandoutVisibility.PlayerFacing, "  Arkham \t", PngFile(), Now);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        var handout = Assert.IsType<Handout>(result.Handout);
        Assert.Null(handout.Content);
        Assert.Equal(PngFile(), handout.File);
        Assert.Equal((HandoutKind.Map, HandoutVisibility.PlayerFacing, "Arkham", 1, Now), (handout.Kind, handout.Visibility, handout.Title, handout.Position, handout.CreatedAt));
        Assert.Same(handout, Assert.Single(scene.Handouts));
    }

    [Fact]
    public void Given_a_rich_text_handout_When_adding_a_file_handout_Then_it_goes_after_the_others()
    {
        var scene = PreparedScene();
        scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Notes", Text, Now);

        var handout = AddImage(scene);

        Assert.Equal(2, handout.Position);
        Assert.Null(scene.Handouts.First().File);
    }

    [Fact]
    public void Given_a_finished_scene_When_adding_a_file_handout_Then_it_is_refused_before_any_field_check()
    {
        var scene = SceneOfStatus(SceneStatus.Finished);

        var result = scene.AddFileHandout(null, null, string.Empty, null, Now);

        Assert.Equal(HandoutOutcome.SceneFinished, result.Outcome);
        Assert.Empty(scene.Handouts);
    }

    [Fact]
    public void Given_invalid_fields_When_adding_a_file_handout_Then_the_first_failing_rule_in_order_wins_and_nothing_changes()
    {
        var scene = PreparedScene();
        var visibility = HandoutVisibility.KeeperFacing;

        Assert.Equal(HandoutOutcome.InvalidTitle, scene.AddFileHandout(null, null, "  ", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.AddFileHandout(null, null, "T", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.AddFileHandout(HandoutKind.ReadAloud, visibility, "T", PngFile(), Now).Outcome);
        Assert.Equal(HandoutOutcome.InvalidVisibility, scene.AddFileHandout(HandoutKind.Image, null, "T", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.MissingFile, scene.AddFileHandout(HandoutKind.Image, visibility, "T", null, Now).Outcome);
        Assert.Equal(HandoutOutcome.MissingFile, scene.AddFileHandout(HandoutKind.Image, visibility, "T", PngFile(size: 0), Now).Outcome);
        Assert.Equal(HandoutOutcome.UnsupportedFileType, scene.AddFileHandout(HandoutKind.Image, visibility, "T", new HandoutFile("k", "a.svg", string.Empty, 10), Now).Outcome);
        Assert.Equal(HandoutOutcome.UnsupportedFileType, scene.AddFileHandout(HandoutKind.Document, visibility, "T", PngFile(), Now).Outcome);
        Assert.Equal(HandoutOutcome.UnsupportedFileType, scene.AddFileHandout(HandoutKind.Map, visibility, "T", PdfFile(), Now).Outcome);
        Assert.Equal(HandoutOutcome.FileTooLarge, scene.AddFileHandout(HandoutKind.Image, visibility, "T", PngFile(size: MaxBytes + 1), Now).Outcome);
        Assert.Empty(scene.Handouts);
    }

    [Fact]
    public void Given_a_file_of_exactly_20_MB_When_adding_Then_it_is_accepted()
    {
        var result = PreparedScene().AddFileHandout(HandoutKind.Image, HandoutVisibility.KeeperFacing, "Big", PngFile(size: MaxBytes), Now);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Equal(MaxBytes, Handout.FileMaxBytes);
    }

    [Fact]
    public void Given_a_file_handout_When_editing_without_a_new_file_Then_the_file_is_kept_and_no_key_is_replaced()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Map, HandoutVisibility.KeeperFacing, " Cellar ", null);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Null(result.ReplacedKey);
        Assert.Equal((HandoutKind.Map, HandoutVisibility.KeeperFacing, "Cellar", 1), (handout.Kind, handout.Visibility, handout.Title, handout.Position));
        Assert.Equal(PngFile(), handout.File);
    }

    [Fact]
    public void Given_a_prepared_scene_When_replacing_the_file_Then_the_old_key_is_returned_and_the_new_file_stored()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);
        var replacement = new HandoutFile("key2", "new.png", "image/png", 99);

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", replacement);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Equal("key1", result.ReplacedKey);
        Assert.Equal(replacement, handout.File);
    }

    [Fact]
    public void Given_an_active_scene_When_replacing_the_file_Then_no_key_is_returned_so_the_old_blob_is_kept()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);
        scene.StartWithOneInvestigator(Now);

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Floor plan", PngFile("key2"));

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Null(result.ReplacedKey);
        Assert.Equal("key2", handout.File!.Key);
    }

    [Fact]
    public void Given_a_finished_scene_or_unknown_handout_When_editing_a_file_handout_Then_it_is_refused_in_that_order()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);
        Assert.Equal(HandoutOutcome.HandoutNotFound, scene.EditFileHandout(Guid.NewGuid(), null, null, "", null).Outcome);
        scene.StartWithOneInvestigator(Now);
        scene.Finish(Now);

        Assert.Equal(HandoutOutcome.SceneFinished, scene.EditFileHandout(handout.Id, null, null, "", null).Outcome);
    }

    [Fact]
    public void Given_invalid_fields_When_editing_a_file_handout_Then_nothing_changes_and_the_first_failing_rule_wins()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);

        Assert.Equal(HandoutOutcome.InvalidTitle, scene.EditFileHandout(handout.Id, null, null, " ", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.EditFileHandout(handout.Id, null, null, "T", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.EditFileHandout(handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "T", null).Outcome);
        Assert.Equal(HandoutOutcome.KindChangeNotAllowed, scene.EditFileHandout(handout.Id, HandoutKind.Document, null, "T", null).Outcome);
        Assert.Equal(HandoutOutcome.InvalidVisibility, scene.EditFileHandout(handout.Id, HandoutKind.Map, null, "T", null).Outcome);
        Assert.Equal(HandoutOutcome.UnsupportedFileType, scene.EditFileHandout(handout.Id, HandoutKind.Map, HandoutVisibility.KeeperFacing, "T", PdfFile()).Outcome);
        Assert.Equal(HandoutOutcome.FileTooLarge, scene.EditFileHandout(handout.Id, HandoutKind.Map, HandoutVisibility.KeeperFacing, "T", PngFile(size: MaxBytes + 1)).Outcome);
        Assert.Equal((HandoutKind.Image, "Floor plan", "key1"), (handout.Kind, handout.Title, handout.File!.Key));
    }

    [Fact]
    public void Given_a_document_or_a_text_handout_When_editing_into_another_family_Then_the_kind_change_is_refused()
    {
        var scene = PreparedScene();
        var document = scene.AddFileHandout(HandoutKind.Document, HandoutVisibility.KeeperFacing, "Letter", PdfFile(), Now).Handout!;
        var text = scene.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Notes", Text, Now).Handout!;

        Assert.Equal(HandoutOutcome.KindChangeNotAllowed, scene.EditFileHandout(document.Id, HandoutKind.Image, HandoutVisibility.KeeperFacing, "Letter", null).Outcome);
        Assert.Equal(HandoutOutcome.KindChangeNotAllowed, scene.EditFileHandout(text.Id, HandoutKind.Image, HandoutVisibility.KeeperFacing, "Notes", PngFile()).Outcome);
        Assert.Equal(HandoutKind.Document, document.Kind);
        Assert.Equal(HandoutKind.Text, text.Kind);
        Assert.Equal(Text, text.Content);
    }

    [Fact]
    public void Given_a_file_handout_When_editing_it_as_rich_text_Then_a_rich_text_kind_is_a_kind_change_and_a_file_kind_is_invalid()
    {
        var scene = PreparedScene();
        var handout = AddImage(scene);

        Assert.Equal(HandoutOutcome.KindChangeNotAllowed, scene.EditHandout(handout.Id, HandoutKind.Text, HandoutVisibility.KeeperFacing, "T", Text).Outcome);
        Assert.Equal(HandoutOutcome.InvalidKind, scene.EditHandout(handout.Id, HandoutKind.Image, HandoutVisibility.KeeperFacing, "T", Text).Outcome);
        Assert.Equal(HandoutKind.Image, handout.Kind);
        Assert.Null(handout.Content);
    }

    [Fact]
    public void Given_a_file_kind_in_a_rich_text_add_When_adding_Then_the_kind_is_invalid()
    {
        var result = PreparedScene().AddHandout(HandoutKind.Map, HandoutVisibility.KeeperFacing, "T", Text, Now);

        Assert.Equal(HandoutOutcome.InvalidKind, result.Outcome);
    }
}
