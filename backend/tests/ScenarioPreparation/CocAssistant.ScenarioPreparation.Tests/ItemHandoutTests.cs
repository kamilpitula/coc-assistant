namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>
/// Adding, editing, removing, and reordering an Item's Handouts (PBI-SP-008 D3, D5). An Item has no Finished state; only
/// "in play" restricts deleting a Handout and deleting a replaced file.
/// </summary>
public class ItemHandoutTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\"}]}]}}";
    private const string Text = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The last entry\"}]}]}}";

    private static Item NewItem() => Item.Create(CampaignId, "Walter Corbitt's diary", Description, null, Now).Item!;

    private static Handout Add(Item item, string title = "The last entry", DateTimeOffset? at = null) =>
        item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, title, Text, at ?? Now).Handout!;

    private static Handout AddImage(Item item, string key = "key-1") =>
        item.AddFileHandout(HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile(key, "photo.png", HandoutMediaTypes.Png, 1000), Now).Handout!;

    [Fact]
    public void Given_an_Item_When_adding_Then_the_Handout_belongs_to_the_Item_only_and_is_placed_after_the_others()
    {
        var item = NewItem();

        var first = Add(item, "First");
        var second = Add(item, "Second");

        Assert.Equal((item.Id, (Guid?)null, 1), (first.ItemId, first.SceneId, first.Position));
        Assert.Equal((item.Id, (Guid?)null, 2), (second.ItemId, second.SceneId, second.Position));
        Assert.Equal(new[] { first.Id, second.Id }, item.Handouts.Select(handout => handout.Id));
    }

    [Fact]
    public void Given_invalid_fields_When_adding_Then_the_domain_refuses_with_the_Handout_outcome_and_adds_nothing()
    {
        var item = NewItem();

        var result = item.AddHandout(HandoutKind.Text, HandoutVisibility.PlayerFacing, " ", Text, Now);

        Assert.Equal((HandoutOutcome.InvalidTitle, null), (result.Outcome, result.Handout));
        Assert.Empty(item.Handouts);
    }

    [Fact]
    public void Given_a_file_When_adding_a_file_Handout_Then_it_holds_the_file_and_belongs_to_the_Item()
    {
        var item = NewItem();

        var handout = AddImage(item);

        Assert.Equal((item.Id, "key-1", HandoutKind.Image), (handout.ItemId, handout.FileKey, handout.Kind));
        Assert.Null(handout.Content);
    }

    [Fact]
    public void Given_a_Handout_When_editing_Then_its_fields_change_and_its_position_is_kept()
    {
        var item = NewItem();
        Add(item, "First");
        var second = Add(item, "Second");

        var result = item.EditHandout(second.Id, HandoutKind.ReadAloud, HandoutVisibility.KeeperFacing, " Renamed ", Text);

        Assert.Equal(HandoutOutcome.Accepted, result.Outcome);
        Assert.Equal(("Renamed", HandoutKind.ReadAloud, HandoutVisibility.KeeperFacing, 2), (second.Title, second.Kind, second.Visibility, second.Position));
    }

    [Fact]
    public void Given_an_unknown_id_When_editing_Then_the_Handout_is_not_found()
    {
        var item = NewItem();

        var result = item.EditHandout(Guid.NewGuid(), HandoutKind.Text, HandoutVisibility.PlayerFacing, "X", Text);

        Assert.Equal(HandoutOutcome.HandoutNotFound, result.Outcome);
    }

    [Fact]
    public void Given_an_Item_not_in_play_When_replacing_a_file_Then_the_replaced_key_is_returned_for_deletion()
    {
        var item = NewItem();
        var handout = AddImage(item, "old-key");

        var result = item.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("new-key", "new.png", HandoutMediaTypes.Png, 10), isInPlay: false);

        Assert.Equal((HandoutOutcome.Accepted, "old-key"), (result.Outcome, result.ReplacedKey));
        Assert.Equal("new-key", handout.FileKey);
    }

    [Fact]
    public void Given_an_Item_in_play_When_replacing_a_file_Then_no_key_is_returned_so_the_old_file_is_kept()
    {
        var item = NewItem();
        var handout = AddImage(item, "old-key");

        var result = item.EditFileHandout(handout.Id, HandoutKind.Image, HandoutVisibility.PlayerFacing, "A photograph", new HandoutFile("new-key", "new.png", HandoutMediaTypes.Png, 10), isInPlay: true);

        Assert.Equal((HandoutOutcome.Accepted, null), (result.Outcome, result.ReplacedKey));
        Assert.Equal("new-key", handout.FileKey);
    }

    [Fact]
    public void Given_an_Item_in_play_When_editing_a_file_Handout_without_a_new_file_Then_the_fields_change_and_no_key_is_returned()
    {
        var item = NewItem();
        var handout = AddImage(item, "old-key");

        var result = item.EditFileHandout(handout.Id, HandoutKind.Map, HandoutVisibility.KeeperFacing, "A map", null, isInPlay: true);

        Assert.Equal((HandoutOutcome.Accepted, null), (result.Outcome, result.ReplacedKey));
        Assert.Equal(("old-key", HandoutKind.Map, "A map"), (handout.FileKey, handout.Kind, handout.Title));
    }

    [Fact]
    public void Given_an_Item_not_in_play_When_removing_a_Handout_Then_it_is_removed()
    {
        var item = NewItem();
        var handout = Add(item);

        var outcome = item.RemoveHandout(handout.Id, isInPlay: false);

        Assert.Equal(HandoutRemovalOutcome.Removed, outcome);
        Assert.Empty(item.Handouts);
    }

    [Fact]
    public void Given_an_Item_in_play_When_removing_a_Handout_Then_it_is_refused_and_the_Handout_stays()
    {
        var item = NewItem();
        var handout = Add(item);

        var outcome = item.RemoveHandout(handout.Id, isInPlay: true);

        Assert.Equal(HandoutRemovalOutcome.ItemInPlay, outcome);
        Assert.Same(handout, Assert.Single(item.Handouts));
    }

    [Fact]
    public void Given_an_Item_in_play_When_removing_an_unknown_Handout_Then_it_is_refused_as_in_play_before_the_id_is_looked_up()
    {
        Assert.Equal(HandoutRemovalOutcome.ItemInPlay, NewItem().RemoveHandout(Guid.NewGuid(), isInPlay: true));
    }

    [Fact]
    public void Given_an_Item_not_in_play_When_removing_an_unknown_Handout_Then_it_is_not_found()
    {
        Assert.Equal(HandoutRemovalOutcome.HandoutNotFound, NewItem().RemoveHandout(Guid.NewGuid(), isInPlay: false));
    }

    [Fact]
    public void Given_three_Handouts_When_reordering_Then_they_are_renumbered_in_the_requested_order()
    {
        var item = NewItem();
        var a = Add(item, "A");
        var b = Add(item, "B");
        var c = Add(item, "C");

        var outcome = item.ReorderHandouts([c.Id, a.Id, b.Id]);

        Assert.Equal(HandoutOrderOutcome.Reordered, outcome);
        Assert.Equal(new[] { c.Id, a.Id, b.Id }, item.Handouts.Select(handout => handout.Id));
        Assert.Equal(new[] { 1, 2, 3 }, item.Handouts.Select(handout => handout.Position));
    }

    [Fact]
    public void Given_a_list_with_duplicates_or_a_mismatch_When_reordering_Then_nothing_changes()
    {
        var item = NewItem();
        var a = Add(item, "A");
        var b = Add(item, "B");

        Assert.Equal(HandoutOrderOutcome.DuplicateIds, item.ReorderHandouts([a.Id, a.Id]));
        Assert.Equal(HandoutOrderOutcome.DoesNotMatchHandouts, item.ReorderHandouts([a.Id]));
        Assert.Equal(HandoutOrderOutcome.DoesNotMatchHandouts, item.ReorderHandouts([a.Id, Guid.NewGuid()]));

        Assert.Equal(new[] { a.Id, b.Id }, item.Handouts.Select(handout => handout.Id));
    }

    [Fact]
    public void Given_Handouts_added_with_out_of_order_times_When_listing_Then_the_stored_position_decides_not_the_creation_time()
    {
        var item = NewItem();
        var later = Add(item, "Later", Now.AddMinutes(5));
        var earlier = Add(item, "Earlier", Now);

        Assert.Equal(new[] { later.Id, earlier.Id }, item.Handouts.Select(handout => handout.Id));
    }
}
