namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Giving an Item on the Active Scene: the check order, the single Reveal to the holder, and moving a held Item (ADR 0029).</summary>
public class SceneGiveItemTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly Guid Outsider = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000009");
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\"}]}]}}";

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now, [Harvey, Lucy], [Harvey, Lucy]);
        return scene;
    }

    private static Item NewItem() => Item.Create(CampaignId, "Walter Corbitt's diary", Description, null, Now).Item!;

    private static Scene ActiveSceneLinking(Item item)
    {
        var scene = ActiveScene();
        scene.LinkItem(item.Id, itemInCampaign: true, Now);
        return scene;
    }

    [Theory]
    [InlineData(SceneStatus.Prepared)]
    [InlineData(SceneStatus.Finished)]
    public void Given_a_scene_that_is_not_active_When_giving_Then_it_is_refused_before_any_other_check(SceneStatus status)
    {
        var scene = PreparedScene();
        if (status == SceneStatus.Finished)
        {
            scene.Start(Now, [Harvey], [Harvey, Lucy]);
            scene.Finish(Now);
        }

        var item = NewItem();
        var result = scene.GiveItem(item, Harvey, Now);

        Assert.Equal(GiveItemOutcome.NotActive, result.Outcome);
        Assert.Null(result.Reveal);
        Assert.Null(item.HolderInvestigatorId);
    }

    [Fact]
    public void Given_an_Item_not_linked_to_the_Active_Scene_When_giving_Then_it_is_refused_before_the_recipients_are_checked()
    {
        var scene = ActiveScene();

        var result = scene.GiveItem(NewItem(), Outsider, Now);

        Assert.Equal(GiveItemOutcome.SubjectNotFound, result.Outcome);
        Assert.Null(result.Reveal);
    }

    [Fact]
    public void Given_an_Investigator_who_is_not_present_When_giving_Then_it_is_refused()
    {
        var item = NewItem();
        var scene = ActiveSceneLinking(item);

        var result = scene.GiveItem(item, Outsider, Now);

        Assert.Equal(GiveItemOutcome.RecipientNotPresent, result.Outcome);
        Assert.Null(result.Reveal);
        Assert.Null(item.HolderInvestigatorId);
    }

    [Fact]
    public void Given_the_current_holder_When_giving_Then_it_is_refused_with_no_Reveal_and_no_holder_change()
    {
        var item = NewItem();
        var scene = ActiveSceneLinking(item);
        item.GiveTo(Harvey, Guid.NewGuid());
        var version = item.Version;

        var result = scene.GiveItem(item, Harvey, Now);

        Assert.Equal(GiveItemOutcome.AlreadyHolder, result.Outcome);
        Assert.Null(result.Reveal);
        Assert.Null(result.FormerHolderId);
        Assert.Equal(Harvey, item.HolderInvestigatorId);
        Assert.Equal(version, item.Version);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public void Given_a_free_Item_When_given_Then_there_is_one_Item_Reveal_to_the_holder_only()
    {
        var item = NewItem();
        var scene = ActiveSceneLinking(item);

        var result = scene.GiveItem(item, Harvey, Now);

        Assert.Equal(GiveItemOutcome.Given, result.Outcome);
        Assert.Null(result.FormerHolderId);
        var reveal = Assert.IsType<Reveal>(result.Reveal);
        Assert.Equal((RevealSubjectType.Item, item.Id, "Walter Corbitt's diary", Description), (reveal.SubjectType, reveal.SubjectId, reveal.Title, reveal.Content));
        Assert.Equal([Harvey], reveal.RecipientIds);
        Assert.Same(reveal, Assert.Single(scene.Reveals));
        Assert.Equal((Harvey, reveal.Id), (item.HolderInvestigatorId, item.HolderRevealId));
    }

    [Fact]
    public void Given_a_held_Item_When_given_to_someone_else_Then_it_moves_and_the_former_holder_is_returned()
    {
        var item = NewItem();
        var scene = ActiveSceneLinking(item);
        item.GiveTo(Harvey, Guid.NewGuid());

        var result = scene.GiveItem(item, Lucy, Now);

        Assert.Equal(GiveItemOutcome.Given, result.Outcome);
        Assert.Equal(Harvey, result.FormerHolderId);
        Assert.Equal(Lucy, item.HolderInvestigatorId);
        Assert.Equal(item.HolderRevealId, result.Reveal!.Id);
        Assert.Single(scene.Reveals);
    }
}
