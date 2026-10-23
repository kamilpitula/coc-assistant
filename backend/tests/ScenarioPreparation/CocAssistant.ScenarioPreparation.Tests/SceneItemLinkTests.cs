namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Linking and unlinking Items on a Scene (PBI-SP-008 D2, D4, specs/scenario-preparation/spec.md).</summary>
public class SceneItemLinkTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ItemId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

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

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_prepared_or_active_scene_When_linking_an_Item_of_the_Campaign_Then_a_link_with_a_new_id_is_added(SceneStatus status)
    {
        var scene = status == SceneStatus.Prepared ? PreparedScene() : ActiveScene();

        var result = scene.LinkItem(ItemId, itemInCampaign: true, Now);

        Assert.Equal(ItemLinkOutcome.Linked, result.Outcome);
        var link = Assert.IsType<ItemLink>(result.Link);
        Assert.NotEqual(Guid.Empty, link.Id);
        Assert.Equal((scene.Id, ItemId, Now), (link.SceneId, link.ItemId, link.CreatedAt));
        Assert.Same(link, Assert.Single(scene.ItemLinks));
    }

    [Fact]
    public void Given_an_Item_already_linked_When_linking_it_again_Then_the_existing_link_is_returned_and_no_second_link_is_added()
    {
        var scene = PreparedScene();
        var first = scene.LinkItem(ItemId, true, Now).Link!;

        var again = scene.LinkItem(ItemId, true, Now.AddMinutes(1));

        Assert.Equal(ItemLinkOutcome.AlreadyLinked, again.Outcome);
        Assert.Same(first, again.Link);
        Assert.Single(scene.ItemLinks);
    }

    [Fact]
    public void Given_an_Item_outside_the_Campaign_When_linking_Then_it_is_refused_and_nothing_is_added()
    {
        var scene = PreparedScene();

        var result = scene.LinkItem(ItemId, itemInCampaign: false, Now);

        Assert.Equal((ItemLinkOutcome.ItemNotInCampaign, null), (result.Outcome, result.Link));
        Assert.Empty(scene.ItemLinks);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Given_a_finished_scene_When_linking_Then_it_is_refused_as_finished_before_the_Item_is_checked(bool itemInCampaign)
    {
        var scene = FinishedScene();

        var result = scene.LinkItem(ItemId, itemInCampaign, Now);

        Assert.Equal((ItemLinkOutcome.SceneFinished, null), (result.Outcome, result.Link));
        Assert.Empty(scene.ItemLinks);
    }

    [Fact]
    public void Given_several_links_When_listing_Then_they_are_in_the_order_linked()
    {
        var scene = PreparedScene();
        var later = scene.LinkItem(Guid.NewGuid(), true, Now.AddMinutes(5)).Link!;
        var earlier = scene.LinkItem(Guid.NewGuid(), true, Now).Link!;

        Assert.Equal(new[] { earlier.Id, later.Id }, scene.ItemLinks.Select(link => link.Id));
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Active)]
    public void Given_a_prepared_or_active_scene_When_unlinking_Then_the_link_is_removed(SceneStatus status)
    {
        var scene = status == SceneStatus.Prepared ? PreparedScene() : ActiveScene();
        var link = scene.LinkItem(ItemId, true, Now).Link!;

        var outcome = scene.UnlinkItem(link.Id);

        Assert.Equal(ItemLinkOutcome.Unlinked, outcome);
        Assert.Empty(scene.ItemLinks);
    }

    [Fact]
    public void Given_a_finished_scene_When_unlinking_Then_it_is_refused_before_the_link_is_looked_up()
    {
        var scene = FinishedScene();

        Assert.Equal(ItemLinkOutcome.SceneFinished, scene.UnlinkItem(Guid.NewGuid()));
    }

    [Fact]
    public void Given_an_unknown_link_id_When_unlinking_Then_the_link_is_not_found()
    {
        var scene = PreparedScene();
        scene.LinkItem(ItemId, true, Now);

        Assert.Equal(ItemLinkOutcome.LinkNotFound, scene.UnlinkItem(Guid.NewGuid()));
        Assert.Single(scene.ItemLinks);
    }
}
