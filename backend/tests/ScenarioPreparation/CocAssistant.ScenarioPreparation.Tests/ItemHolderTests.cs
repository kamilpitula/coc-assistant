namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Holding an Item: giving it, taking it back, and the version every play-usage write bumps (ADR 0029).</summary>
public class ItemHolderTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Harvey = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid Lucy = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\"}]}]}}";

    private static Item NewItem() => Item.Create(CampaignId, "Walter Corbitt's diary", Description, null, Now).Item!;

    [Fact]
    public void Given_a_new_Item_When_created_Then_no_one_holds_it_and_the_version_starts_at_zero()
    {
        var item = NewItem();

        Assert.Equal((null, null, 0), (item.HolderInvestigatorId, item.HolderRevealId, item.Version));
    }

    [Fact]
    public void Given_a_free_Item_When_given_Then_the_holder_and_the_Reveal_are_set_and_the_version_grows()
    {
        var item = NewItem();
        var revealId = Guid.NewGuid();

        var formerHolder = item.GiveTo(Harvey, revealId);

        Assert.Null(formerHolder);
        Assert.Equal((Harvey, revealId, 1), (item.HolderInvestigatorId, item.HolderRevealId, item.Version));
    }

    [Fact]
    public void Given_a_held_Item_When_given_to_someone_else_Then_the_former_holder_is_returned_and_replaced()
    {
        var item = NewItem();
        item.GiveTo(Harvey, Guid.NewGuid());
        var revealId = Guid.NewGuid();

        var formerHolder = item.GiveTo(Lucy, revealId);

        Assert.Equal(Harvey, formerHolder);
        Assert.Equal((Lucy, revealId, 2), (item.HolderInvestigatorId, item.HolderRevealId, item.Version));
    }

    [Fact]
    public void Given_a_held_Item_When_taken_back_Then_both_columns_are_cleared_and_the_version_grows()
    {
        var item = NewItem();
        item.GiveTo(Harvey, Guid.NewGuid());

        item.TakeBack();

        Assert.Equal((null, null, 2), (item.HolderInvestigatorId, item.HolderRevealId, item.Version));
    }

    [Fact]
    public void Given_an_Item_When_marked_in_play_Then_the_version_grows()
    {
        var item = NewItem();

        item.MarkInPlay();

        Assert.Equal(1, item.Version);
    }

    [Fact]
    public void Given_an_Item_handout_When_removed_Then_the_version_grows()
    {
        var item = NewItem();
        var handoutId = item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, "The last entry", Description, Now).Handout!.Id;

        var outcome = item.RemoveHandout(handoutId, isInPlay: false);

        Assert.Equal(HandoutRemovalOutcome.Removed, outcome);
        Assert.Equal(1, item.Version);
    }

    [Fact]
    public void Given_an_Item_file_handout_When_its_file_is_replaced_Then_the_version_grows()
    {
        var item = NewItem();
        var handoutId = item.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("old-key", "photo.png", "image/png", 1000), Now).Handout!.Id;

        var result = item.EditFileHandout(handoutId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("new-key", "new.png", "image/png", 10), isInPlay: false);

        Assert.Equal("old-key", result.ReplacedKey);
        Assert.Equal(1, item.Version);
    }

    [Fact]
    public void Given_an_Item_in_play_When_its_file_is_replaced_Then_the_version_does_not_grow()
    {
        var item = NewItem();
        var handoutId = item.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("old-key", "photo.png", "image/png", 1000), Now).Handout!.Id;

        var result = item.EditFileHandout(handoutId, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("new-key", "new.png", "image/png", 10), isInPlay: true);

        Assert.Null(result.ReplacedKey);
        Assert.Equal(0, item.Version);
    }
}
