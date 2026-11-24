namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>A Scene's Keeper notes carry their own version, checked apart from the Scene version (ADR 0037).</summary>
public class SceneKeeperNotesTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddHours(1);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Cellar\",\"format\":1}]}]}}";
    private const string OtherNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Attic\",\"format\":1}]}]}}";
    private const string ImageNotes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private static Scene PreparedScene() =>
        Scene.Create(TheHaunting, "The Corbitt House", "Arkham", Notes, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.StartWithOneInvestigator(Now);
        return scene;
    }

    private static Scene FinishedScene()
    {
        var scene = ActiveScene();
        scene.Finish(Later);
        return scene;
    }

    [Fact]
    public void Given_a_new_scene_When_created_Then_the_notes_version_is_zero()
    {
        Assert.Equal(0, PreparedScene().NotesVersion);
    }

    [Fact]
    public void Given_a_prepared_scene_When_checking_a_save_at_the_current_version_Then_it_is_accepted()
    {
        Assert.Equal(KeeperNotesSaveOutcome.Accepted, PreparedScene().CheckKeeperNotesSave(OtherNotes, 0));
    }

    [Fact]
    public void Given_an_active_scene_When_checking_a_save_at_the_current_version_Then_it_is_accepted()
    {
        Assert.Equal(KeeperNotesSaveOutcome.Accepted, ActiveScene().CheckKeeperNotesSave(OtherNotes, 0));
    }

    [Fact]
    public void Given_a_finished_scene_When_checking_a_save_at_the_current_version_Then_it_is_accepted()
    {
        Assert.Equal(KeeperNotesSaveOutcome.Accepted, FinishedScene().CheckKeeperNotesSave(OtherNotes, 0));
    }

    [Fact]
    public void Given_a_save_at_a_stale_version_When_checking_Then_it_is_stale()
    {
        Assert.Equal(KeeperNotesSaveOutcome.StaleNotesVersion, PreparedScene().CheckKeeperNotesSave(OtherNotes, 1));
    }

    [Fact]
    public void Given_a_stale_and_invalid_save_When_checking_Then_the_stale_version_wins()
    {
        Assert.Equal(KeeperNotesSaveOutcome.StaleNotesVersion, PreparedScene().CheckKeeperNotesSave("{}", 1));
    }

    [Fact]
    public void Given_notes_with_a_disallowed_node_When_checking_Then_they_are_invalid()
    {
        Assert.Equal(KeeperNotesSaveOutcome.InvalidKeeperNotes, PreparedScene().CheckKeeperNotesSave(ImageNotes, 0));
    }

    [Fact]
    public void Given_notes_over_204800_bytes_When_checking_Then_they_are_invalid()
    {
        var oversize = OversizeNotes();

        Assert.True(Encoding.UTF8.GetByteCount(oversize) > RichTextDocument.MaxBytes);
        Assert.Equal(KeeperNotesSaveOutcome.InvalidKeeperNotes, PreparedScene().CheckKeeperNotesSave(oversize, 0));
    }

    [Fact]
    public void Given_absent_notes_When_checking_Then_the_save_clears_them()
    {
        Assert.Equal(KeeperNotesSaveOutcome.Accepted, PreparedScene().CheckKeeperNotesSave(null, 0));
    }

    [Fact]
    public void Given_any_check_When_checking_Then_nothing_changes()
    {
        var accepted = PreparedScene();
        var refused = PreparedScene();

        Assert.Equal(KeeperNotesSaveOutcome.Accepted, accepted.CheckKeeperNotesSave(OtherNotes, 0));
        Assert.Equal(KeeperNotesSaveOutcome.StaleNotesVersion, refused.CheckKeeperNotesSave(OtherNotes, 1));

        Assert.Equal((Notes, 0, 0), (accepted.KeeperNotes, accepted.NotesVersion, accepted.Version));
        Assert.Equal((Notes, 0, 0), (refused.KeeperNotes, refused.NotesVersion, refused.Version));
    }

    [Fact]
    public void Given_a_prepared_scene_When_editing_title_and_location_Then_the_notes_are_untouched()
    {
        var scene = PreparedScene();

        Assert.Equal(SceneFieldsOutcome.Accepted, scene.Edit(" New title ", " Elsewhere "));

        Assert.Equal(("New title", "Elsewhere", Notes), (scene.Title, scene.Location, scene.KeeperNotes));
    }

    [Fact]
    public void Given_a_finished_scene_When_editing_Then_it_is_finished_and_nothing_changes()
    {
        var scene = FinishedScene();

        Assert.Equal(SceneFieldsOutcome.SceneFinished, scene.Edit("Changed", "Somewhere"));
        Assert.Equal(("The Corbitt House", "Arkham", Notes), (scene.Title, scene.Location, scene.KeeperNotes));
    }

    private static string OversizeNotes()
    {
        const string prefix = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"";
        const string suffix = "\"}]}]}}";
        return prefix + new string('a', RichTextDocument.MaxBytes) + suffix;
    }
}
