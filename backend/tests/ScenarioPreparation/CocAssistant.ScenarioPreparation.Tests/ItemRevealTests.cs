namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Revealing an Item and an Item's Handouts on the Active Scene (specs/scene-play/spec.md; PBI-SPL-003 D1).</summary>
public class ItemRevealTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Harvey = SceneStartExtensions.Harvey;
    private static readonly Guid Lucy = SceneStartExtensions.Lucy;
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);
    private static readonly Scenario TheHaunting = Scenario.Create(CampaignId, "The Haunting", null, 1, Now).Scenario!;

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\"}]}]}}";
    private const string Entry = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The last entry\"}]}]}}";

    private static Scene PreparedScene() => Scene.Create(TheHaunting, "The Corbitt House", "Arkham", null, 1, Now).Scene!;

    private static Scene ActiveScene()
    {
        var scene = PreparedScene();
        scene.Start(Now, [Harvey, Lucy], [Harvey, Lucy]);
        return scene;
    }

    private static Item NewItem() => Item.Create(CampaignId, "Walter Corbitt's diary", Description, null, Now).Item!;

    [Fact]
    public void Given_a_linked_Item_When_revealing_Then_the_name_and_description_are_snapshotted_and_the_Item_is_returned()
    {
        var scene = ActiveScene();
        var item = NewItem();
        scene.LinkItem(item.Id, itemInCampaign: true, Now);

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Item, item.Id), [Harvey], Now, [item]);

        Assert.Equal(RevealOutcome.Revealed, result.Outcome);
        Assert.Equal((RevealSubjectType.Item, item.Id, "Walter Corbitt's diary", Description), (result.Reveal!.SubjectType, result.Reveal.SubjectId, result.Reveal.Title, result.Reveal.Content));
        Assert.Null(result.Reveal.HandoutKind);
        Assert.Null(result.Reveal.File);
        Assert.Same(item, result.OwningItem);
    }

    [Fact]
    public void Given_an_Item_not_linked_to_the_Active_Scene_When_revealing_Then_the_subject_is_not_found()
    {
        var scene = ActiveScene();

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Item, Guid.NewGuid()), [Harvey], Now, [NewItem()]);

        Assert.Equal(RevealOutcome.SubjectNotFound, result.Outcome);
        Assert.Null(result.Reveal);
    }

    [Fact]
    public void Given_a_Player_facing_handout_of_a_linked_Item_When_revealing_Then_it_is_revealed_and_the_Item_is_returned()
    {
        var scene = ActiveScene();
        var item = NewItem();
        var handoutId = item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "The last entry", Entry, Now).Handout!.Id;
        scene.LinkItem(item.Id, itemInCampaign: true, Now);

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Handout, handoutId), null, Now, [item]);

        Assert.Equal(RevealOutcome.Revealed, result.Outcome);
        Assert.Equal(("The last entry", Entry), (result.Reveal!.Title, result.Reveal.Content));
        Assert.Equal([Harvey, Lucy], result.Reveal.RecipientIds.Order());
        Assert.Same(item, result.OwningItem);
    }

    [Fact]
    public void Given_a_Keeper_facing_handout_of_a_linked_Item_When_revealing_Then_it_is_refused()
    {
        var scene = ActiveScene();
        var item = NewItem();
        var handoutId = item.AddHandout(HandoutKind.Text, HandoutVisibility.KeeperFacing, "Corbitt's plan", Entry, Now).Handout!.Id;
        scene.LinkItem(item.Id, itemInCampaign: true, Now);

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Handout, handoutId), [Harvey], Now, [item]);

        Assert.Equal(RevealOutcome.SubjectKeeperFacing, result.Outcome);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public void Given_a_handout_of_an_unlinked_Item_When_revealing_Then_the_subject_is_not_found()
    {
        var scene = ActiveScene();
        var item = NewItem();
        var handoutId = item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "The last entry", Entry, Now).Handout!.Id;

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Handout, handoutId), [Harvey], Now, []);

        Assert.Equal(RevealOutcome.SubjectNotFound, result.Outcome);
        Assert.Empty(scene.Reveals);
    }

    [Fact]
    public void Given_a_Scene_handout_and_an_Item_handout_with_no_linked_Items_When_revealing_the_Scene_handout_Then_it_is_still_revealed()
    {
        var scene = ActiveScene();
        var handoutId = scene.AddHandout(HandoutKind.ReadAloud, HandoutVisibility.PlayerFacing, "The cellar door", Entry, Now).Handout!.Id;

        var result = scene.Reveal(new RevealSubject(RevealSubjectType.Handout, handoutId), [Harvey], Now);

        Assert.Equal(RevealOutcome.Revealed, result.Outcome);
        Assert.Null(result.OwningItem);
    }
}
