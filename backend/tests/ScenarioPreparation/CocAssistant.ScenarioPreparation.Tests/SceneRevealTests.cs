namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Revealing Player-facing Handouts and Non-Player Entity links of an Active Scene (specs/scene-play/spec.md; PBI-SPL-002 D1, D2).</summary>
public class SceneRevealTests
{
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid Outsider = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000009");
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The door creaks open\"}]}]}}";

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now, [Harvey, Lucy], [Harvey, Lucy]);
        return scene;
    }

    private static Guid AddText(Scene scene, HandoutVisibility visibility = HandoutVisibility.PlayerFacing) =>
        scene.AddHandout(HandoutKind.ReadAloud, visibility, "The cellar door", Text, Now).Handout!.Id;

    private static Guid AddMap(Scene scene, string? description = "A cellar plan")
    {
        var file = new HandoutFile("key1", "cellar.png", "image/png", 68);
        return scene.AddFileHandout(HandoutKind.Map, HandoutVisibility.PlayerFacing, "Corbitt House cellar", file, Now, description).Handout!.Id;
    }

    private static RevealSubject Handout(Guid id) => new(RevealSubjectType.Handout, id);

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Finished)]
    public void Given_a_scene_that_is_not_active_When_revealing_Then_it_is_refused_before_any_other_check(SceneStatus status)
    {
        var scene = PreparedScene();
        if (status == SceneStatus.Finished)
        {
            scene.Start(Now, [Harvey], [Harvey]);
            scene.Finish(Now);
        }

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Item, Guid.NewGuid()), [], Now);

        Assert.Equal(RevealOutcome.NotActive, result.Outcome);
        Assert.Null(result.Reveal);
    }

    [Fact]
    public void Given_an_Item_not_linked_to_the_Active_Scene_When_revealing_Then_the_subject_is_not_found_even_when_the_recipients_are_invalid()
    {
        var scene = ActiveScene();

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Item, Guid.NewGuid()), [], Now);

        Assert.Equal(RevealOutcome.SubjectNotFound, result.Outcome);
    }

    [Fact]
    public void Given_an_unknown_handout_When_revealing_Then_the_subject_is_not_found()
    {
        var scene = ActiveScene();

        var result = scene.Reveal(Handout(Guid.NewGuid()), [Outsider], Now);

        Assert.Equal(RevealOutcome.SubjectNotFound, result.Outcome);
    }

    [Fact]
    public void Given_a_keeper_facing_handout_When_revealing_Then_it_is_refused_before_the_recipients_are_checked()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene, HandoutVisibility.KeeperFacing);

        var result = scene.Reveal(Handout(handoutId), [Outsider], Now);

        Assert.Equal(RevealOutcome.SubjectKeeperFacing, result.Outcome);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public void Given_invalid_recipients_When_revealing_Then_each_is_refused_and_nothing_is_recorded()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);

        Assert.Equal(RevealOutcome.NoRecipient, scene.Reveal(Handout(handoutId), [], Now).Outcome);
        Assert.Equal(RevealOutcome.DuplicateRecipient, scene.Reveal(Handout(handoutId), [Harvey, Harvey], Now).Outcome);
        Assert.Equal(RevealOutcome.RecipientNotPresent, scene.Reveal(Handout(handoutId), [Harvey, Outsider], Now).Outcome);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public void Given_no_recipients_given_When_revealing_Then_every_investigator_present_receives_it()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);

        var result = scene.Reveal(Handout(handoutId), null, Now);

        Assert.Equal(RevealOutcome.Revealed, result.Outcome);
        Assert.Equal(new[] { Harvey, Lucy }.Order(), result.Reveal!.RecipientIds.Order());
        Assert.Same(result.Reveal, Assert.Single(scene.Reveals));
    }

    [Fact]
    public void Given_chosen_recipients_When_revealing_Then_only_they_receive_it()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);

        var result = scene.Reveal(Handout(handoutId), [Lucy], Now);

        Assert.Equal([Lucy], result.Reveal!.RecipientIds);
    }

    [Fact]
    public void Given_a_text_handout_When_revealing_Then_the_snapshot_holds_its_fields_and_no_file()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);

        var reveal = scene.Reveal(Handout(handoutId), [Harvey], Now.AddMinutes(5)).Reveal!;

        Assert.Equal(
            (scene.Id, RevealSubjectType.Handout, handoutId, Now.AddMinutes(5), "The cellar door", HandoutKind.ReadAloud, Text, null, null),
            (reveal.SceneId, reveal.SubjectType, reveal.SubjectId, reveal.RevealedAt, reveal.Title, reveal.HandoutKind, reveal.Content, reveal.File, reveal.ImageDescription));
    }

    [Fact]
    public void Given_a_map_handout_When_revealing_Then_the_snapshot_holds_its_file_and_image_description()
    {
        var scene = ActiveScene();
        var handoutId = AddMap(scene);

        var reveal = scene.Reveal(Handout(handoutId), null, Now).Reveal!;

        Assert.Equal((HandoutKind.Map, null, new HandoutFile("key1", "cellar.png", "image/png", 68), "A cellar plan"), (reveal.HandoutKind, reveal.Content, reveal.File, reveal.ImageDescription));
    }

    [Fact]
    public void Given_a_non_player_entity_link_When_revealing_Then_the_snapshot_holds_its_player_facing_name_and_description()
    {
        var scene = ActiveScene();
        var link = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, Guid.NewGuid(), true, "A nervous clerk", Text, Now).Link!;

        var reveal = scene.Reveal(new RevealSubject(RevealSubjectType.NonPlayerEntity, link.Id), [Harvey], Now).Reveal!;

        Assert.Equal(
            (RevealSubjectType.NonPlayerEntity, link.Id, "A nervous clerk", Text, null, null, null),
            (reveal.SubjectType, reveal.SubjectId, reveal.Title, reveal.Content, reveal.HandoutKind, reveal.File, reveal.ImageDescription));
    }

    [Fact]
    public void Given_a_link_without_a_description_When_revealing_Then_the_snapshot_has_no_content()
    {
        var scene = ActiveScene();
        var link = scene.LinkNonPlayerEntity(NonPlayerEntityType.MythosCreature, Guid.NewGuid(), true, "Something in the dark", null, Now).Link!;

        var reveal = scene.Reveal(new RevealSubject(RevealSubjectType.NonPlayerEntity, link.Id), null, Now).Reveal!;

        Assert.Null(reveal.Content);
    }

    [Fact]
    public void Given_a_revealed_handout_When_it_is_edited_or_its_file_replaced_or_the_link_removed_Then_the_reveal_is_unchanged_and_not_versioned()
    {
        var scene = ActiveScene();
        var handoutId = AddMap(scene);
        var link = scene.LinkNonPlayerEntity(NonPlayerEntityType.HumanNpc, Guid.NewGuid(), true, "A clerk", Text, Now).Link!;
        var handoutReveal = scene.Reveal(Handout(handoutId), [Harvey], Now).Reveal!;
        var linkReveal = scene.Reveal(new RevealSubject(RevealSubjectType.NonPlayerEntity, link.Id), [Harvey], Now).Reveal!;
        var versionBefore = scene.Version;

        scene.EditFileHandout(handoutId, HandoutKind.Map, HandoutVisibility.KeeperFacing, "Renamed", new HandoutFile("key2", "new.png", "image/png", 9), "New description");
        scene.EditNonPlayerEntityLink(link.Id, "Renamed clerk", null);
        scene.UnlinkNonPlayerEntity(link.Id);

        Assert.Equal(("Corbitt House cellar", new HandoutFile("key1", "cellar.png", "image/png", 68), "A cellar plan"), (handoutReveal.Title, handoutReveal.File, handoutReveal.ImageDescription));
        Assert.Equal(("A clerk", Text), (linkReveal.Title, linkReveal.Content));
        Assert.Equal(versionBefore, scene.Version);
    }

    [Fact]
    public void Given_a_revealed_subject_When_revealing_it_again_Then_a_second_reveal_is_recorded_newest_first()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);

        var first = scene.Reveal(Handout(handoutId), [Harvey], Now).Reveal!;
        var second = scene.Reveal(Handout(handoutId), [Harvey], Now.AddMinutes(1)).Reveal!;

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal([second, first], scene.Reveals);
    }

    [Fact]
    public void Given_a_reveal_When_it_is_recorded_Then_the_scene_version_is_not_incremented()
    {
        var scene = ActiveScene();
        var handoutId = AddText(scene);
        var versionBefore = scene.Version;

        scene.Reveal(Handout(handoutId), null, Now);

        Assert.Equal(versionBefore, scene.Version);
    }
}
