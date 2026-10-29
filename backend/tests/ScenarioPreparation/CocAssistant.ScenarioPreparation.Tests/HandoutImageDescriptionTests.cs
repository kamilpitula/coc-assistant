namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>The optional image description of Image and Map Handouts (PBI-SPL-002 D7) and the Version bump of a Prepared file replace (D2).</summary>
public class HandoutImageDescriptionTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static HandoutFile PngFile(string key = "key1") => new(key, "plan.png", "image/png", 68);

    private static HandoutFile PdfFile() => new("pdfkey", "letter.pdf", "application/pdf", 1200);

    [Theory]
    [InlineData("  A plan of the cellar \t", "A plan of the cellar")]
    [InlineData("   ", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Given_an_image_or_map_handout_When_adding_with_a_description_Then_it_is_trimmed_and_empty_becomes_null(string? given, string? stored)
    {
        var scene = PreparedScene();

        var image = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now, given).Handout!;
        var map = scene.AddFileHandout(HandoutKind.Map, HandoutVisibility.PlayerFacing, "Map", PngFile("key2"), Now, given).Handout!;

        Assert.Equal((stored, stored), (image.ImageDescription, map.ImageDescription));
    }

    [Fact]
    public void Given_a_description_of_1000_characters_When_adding_Then_it_is_accepted_and_1001_is_refused()
    {
        var scene = PreparedScene();

        var accepted = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now, new string('a', 1000));
        var refused = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile("key2"), Now, new string('a', 1001));

        Assert.Equal(HandoutOutcome.Accepted, accepted.Outcome);
        Assert.Equal(HandoutOutcome.InvalidImageDescription, refused.Outcome);
        Assert.Null(refused.Handout);
        Assert.Single(scene.Handouts);
    }

    [Fact]
    public void Given_a_document_handout_When_adding_with_a_description_Then_none_is_stored()
    {
        var scene = PreparedScene();

        var handout = scene.AddFileHandout(HandoutKind.Document, HandoutVisibility.PlayerFacing, "Letter", PdfFile(), Now, "Ignored").Handout!;

        Assert.Null(handout.ImageDescription);
    }

    [Fact]
    public void Given_a_rich_text_handout_When_added_Then_it_has_no_description()
    {
        var scene = PreparedScene();
        var text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"Hi\"}]}]}}";

        var handout = scene.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "Note", text, Now).Handout!;

        Assert.Null(handout.ImageDescription);
    }

    [Fact]
    public void Given_a_described_image_When_editing_Then_the_description_is_fully_replaced_and_cleared_when_absent()
    {
        var scene = PreparedScene();
        var handout = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now, "First").Handout!;

        scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", null, " Second ");
        Assert.Equal("Second", handout.ImageDescription);

        scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", null);
        Assert.Null(handout.ImageDescription);
    }

    [Fact]
    public void Given_a_too_long_description_When_editing_Then_it_is_refused_and_nothing_changes()
    {
        var scene = PreparedScene();
        var handout = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now, "First").Handout!;

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Renamed", null, new string('a', 1001));

        Assert.Equal(HandoutOutcome.InvalidImageDescription, result.Outcome);
        Assert.Equal(("Plan", "First"), (handout.Title, handout.ImageDescription));
    }

    [Fact]
    public void Given_a_prepared_scene_When_a_file_is_replaced_Then_the_version_is_incremented_and_the_key_returned()
    {
        var scene = PreparedScene();
        var handout = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now).Handout!;

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile("key2"));

        Assert.Equal(("key1", 1), (result.ReplacedKey, scene.Version));
    }

    [Fact]
    public void Given_a_prepared_scene_When_no_file_is_replaced_Then_the_version_is_unchanged()
    {
        var scene = PreparedScene();
        var handout = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now).Handout!;

        scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Renamed", null);

        Assert.Equal(0, scene.Version);
    }

    [Fact]
    public void Given_an_active_scene_When_a_file_is_replaced_Then_no_key_is_returned_and_the_version_is_unchanged()
    {
        var scene = PreparedScene();
        var handout = scene.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile(), Now).Handout!;
        scene.StartWithOneInvestigator(Now);
        var versionAfterStart = scene.Version;

        var result = scene.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "Plan", PngFile("key2"));

        Assert.Null(result.ReplacedKey);
        Assert.Equal(versionAfterStart, scene.Version);
    }
}
