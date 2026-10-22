namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Linking, editing, and unlinking Non-Player Entities on a Scene (PBI-SP-004, specs/scenario-preparation/spec.md).</summary>
public class SceneLinkTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid EntityId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 10, 21, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A shape\",\"format\":1}]}]}}";
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

    private static NonPlayerEntityLink LinkOne(Scene scene) =>
        scene.LinkNonPlayerEntity(NonPlayerEntityType.MythosCreature, EntityId, "A shape", Description, Now).Link!;

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_prepared_or_active_scene_When_linking_Then_a_link_with_a_new_id_the_trimmed_name_and_the_time_is_added(SceneStatus status)
    {
        var scene = status == SceneStatus.Prepared ? PreparedScene() : ActiveScene();

        var result = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "  The landlord \t", Description, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, result.Outcome);
        var link = Assert.IsType<NonPlayerEntityLink>(result.Link);
        Assert.NotEqual(Guid.Empty, link.Id);
        Assert.Equal(
            (scene.Id, NonPlayerEntityType.HumanNpc, EntityId, "The landlord", Description, Now),
            (link.SceneId, link.Type, link.NonPlayerEntityId, link.PlayerFacingName, link.PlayerFacingDescription, link.CreatedAt));
        Assert.Same(link, Assert.Single(scene.NonPlayerEntityLinks));
    }

    [Theory]
    [InlineData(NonPlayerEntityType.HumanNpc)]
    [InlineData(NonPlayerEntityType.MythosCreature)]
    public void Given_each_entity_type_When_linking_Then_the_type_and_entity_id_are_read_back_from_the_one_key_that_is_set(NonPlayerEntityType type)
    {
        var link = PreparedScene().LinkNonPlayerEntity(type, EntityId, "A shape", null, Now).Link!;

        Assert.Equal((type, EntityId), (link.Type, link.NonPlayerEntityId));
    }

    [Fact]
    public void Given_a_null_description_When_linking_Then_it_is_accepted_as_no_description()
    {
        var result = PreparedScene().LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "A shape", null, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, result.Outcome);
        Assert.Null(result.Link!.PlayerFacingDescription);
    }

    [Fact]
    public void Given_the_same_entity_When_linking_it_twice_Then_two_links_with_different_ids_exist()
    {
        var scene = PreparedScene();

        var first = LinkOne(scene);
        var second = LinkOne(scene);

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(2, scene.NonPlayerEntityLinks.Count);
    }

    [Fact]
    public void Given_links_made_at_different_times_When_reading_them_Then_they_are_in_the_order_linked()
    {
        var scene = PreparedScene();
        var later = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "Later", null, Now.AddMinutes(2)).Link!;
        var earlier = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "Earlier", null, Now.AddMinutes(1)).Link!;

        Assert.Equal([earlier.Id, later.Id], scene.NonPlayerEntityLinks.Select(link => link.Id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  \t ")]
    public void Given_an_empty_or_whitespace_name_When_linking_Then_it_is_refused_and_nothing_is_added(string name)
    {
        var scene = PreparedScene();

        var result = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, name, null, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingName, result.Outcome);
        Assert.Null(result.Link);
        Assert.Empty(scene.NonPlayerEntityLinks);
    }

    [Fact]
    public void Given_names_at_and_over_the_limit_When_linking_Then_200_is_accepted_and_201_is_refused()
    {
        var scene = PreparedScene();

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, new string('n', 200), null, Now).Outcome);
        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingName, scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, new string('n', 201), null, Now).Outcome);
    }

    [Theory]
    [InlineData("{not json")]
    [InlineData(Image)]
    public void Given_a_malformed_or_disallowed_description_When_linking_Then_it_is_refused_and_nothing_is_added(string description)
    {
        var scene = PreparedScene();

        var result = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "A shape", description, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingDescription, result.Outcome);
        Assert.Empty(scene.NonPlayerEntityLinks);
    }

    [Fact]
    public void Given_a_description_over_the_size_limit_When_linking_Then_it_is_refused()
    {
        var oversize = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"" + new string('x', RichTextDocument.MaxBytes) + "\"}]}]}}";

        var result = PreparedScene().LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, "A shape", oversize, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingDescription, result.Outcome);
    }

    [Fact]
    public void Given_a_finished_scene_When_linking_Then_it_is_refused_before_the_fields_are_checked()
    {
        var scene = FinishedScene();

        var result = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, EntityId, string.Empty, Image, Now);

        Assert.Equal(NonPlayerEntityLinkOutcome.SceneFinished, result.Outcome);
        Assert.Empty(scene.NonPlayerEntityLinks);
    }

    [Fact]
    public void Given_a_link_When_editing_it_Then_the_name_is_trimmed_and_the_description_replaced_but_the_entity_stays()
    {
        var scene = PreparedScene();
        var link = LinkOne(scene);

        var result = scene.EditNonPlayerEntityLink(link.Id, "  Renamed ", null);

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, result.Outcome);
        Assert.Same(link, result.Link);
        Assert.Equal(
            ("Renamed", null, Now, NonPlayerEntityType.MythosCreature, EntityId),
            (link.PlayerFacingName, link.PlayerFacingDescription, link.CreatedAt, link.Type, link.NonPlayerEntityId));
    }

    [Fact]
    public void Given_an_active_scene_When_editing_a_link_Then_it_is_accepted()
    {
        var scene = ActiveScene();
        var link = LinkOne(scene);

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, scene.EditNonPlayerEntityLink(link.Id, "Renamed", Description).Outcome);
    }

    [Fact]
    public void Given_invalid_fields_When_editing_a_link_Then_it_is_refused_and_the_link_is_unchanged()
    {
        var scene = PreparedScene();
        var link = LinkOne(scene);

        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingName, scene.EditNonPlayerEntityLink(link.Id, " ", Description).Outcome);
        Assert.Equal(NonPlayerEntityLinkOutcome.InvalidPlayerFacingDescription, scene.EditNonPlayerEntityLink(link.Id, "Renamed", Image).Outcome);
        Assert.Equal(("A shape", Description), (link.PlayerFacingName, link.PlayerFacingDescription));
    }

    [Fact]
    public void Given_an_unknown_link_id_When_editing_Then_the_link_is_not_found()
    {
        var result = PreparedScene().EditNonPlayerEntityLink(Guid.NewGuid(), "Renamed", null);

        Assert.Equal(NonPlayerEntityLinkOutcome.LinkNotFound, result.Outcome);
        Assert.Null(result.Link);
    }

    [Fact]
    public void Given_a_scene_finished_after_linking_When_editing_the_link_Then_it_is_refused_before_the_fields_and_the_link_is_unchanged()
    {
        var scene = ActiveScene();
        var link = LinkOne(scene);
        scene.Finish(Now.AddHours(1));

        var result = scene.EditNonPlayerEntityLink(link.Id, string.Empty, Image);

        Assert.Equal(NonPlayerEntityLinkOutcome.SceneFinished, result.Outcome);
        Assert.Equal("A shape", link.PlayerFacingName);
    }

    [Fact]
    public void Given_two_links_When_unlinking_one_Then_only_that_link_is_removed()
    {
        var scene = PreparedScene();
        var kept = LinkOne(scene);
        var removed = LinkOne(scene);

        var outcome = scene.UnlinkNonPlayerEntity(removed.Id);

        Assert.Equal(NonPlayerEntityLinkOutcome.Accepted, outcome);
        Assert.Same(kept, Assert.Single(scene.NonPlayerEntityLinks));
    }

    [Fact]
    public void Given_an_unknown_link_id_When_unlinking_Then_the_link_is_not_found_and_the_links_are_unchanged()
    {
        var scene = PreparedScene();
        LinkOne(scene);

        Assert.Equal(NonPlayerEntityLinkOutcome.LinkNotFound, scene.UnlinkNonPlayerEntity(Guid.NewGuid()));
        Assert.Single(scene.NonPlayerEntityLinks);
    }

    [Fact]
    public void Given_a_scene_finished_after_linking_When_unlinking_Then_it_is_refused_and_the_link_stays()
    {
        var scene = ActiveScene();
        var link = LinkOne(scene);
        scene.Finish(Now.AddHours(1));

        Assert.Equal(NonPlayerEntityLinkOutcome.SceneFinished, scene.UnlinkNonPlayerEntity(link.Id));
        Assert.Single(scene.NonPlayerEntityLinks);
    }

    [Fact]
    public void Given_a_finished_scene_When_unlinking_an_unknown_link_Then_finished_is_reported_first()
    {
        Assert.Equal(NonPlayerEntityLinkOutcome.SceneFinished, FinishedScene().UnlinkNonPlayerEntity(Guid.NewGuid()));
    }
}
