namespace CocAssistant.ScenarioPreparation.Tests;

/// <summary>Creating and editing an Item (PBI-SP-008, specs/scenario-preparation/spec.md, Constraints).</summary>
public class ItemTests
{
    private static readonly Guid CampaignId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 10, 23, 12, 0, 0, TimeSpan.Zero);

    private const string Description = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"A leather diary\"}]}]}}";
    private const string Notes = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\"The last page is torn out\"}]}]}}";
    private const string Blank = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\" \"}]}]}}";
    private const string ImageNode = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"image\"}]}}";

    private static Item NewItem() => Item.Create(CampaignId, "Walter Corbitt's diary", Description, Notes, Now).Item!;

    [Fact]
    public void Given_valid_fields_When_creating_Then_the_Item_has_the_trimmed_name_both_texts_the_Campaign_and_the_time()
    {
        var creation = Item.Create(CampaignId, "  Walter Corbitt's diary \t", Description, Notes, Now);

        Assert.Equal(ItemFieldsOutcome.Accepted, creation.Outcome);
        var item = Assert.IsType<Item>(creation.Item);
        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.Equal(
            (CampaignId, "Walter Corbitt's diary", Description, Notes, Now),
            (item.CampaignId, item.Name, item.PlayerFacingDescription, item.KeeperNotes, item.CreatedAt));
        Assert.Empty(item.Handouts);
    }

    [Fact]
    public void Given_no_Keeper_notes_When_creating_Then_the_Item_is_created_without_them()
    {
        var creation = Item.Create(CampaignId, "The cellar key", Description, null, Now);

        Assert.Equal(ItemFieldsOutcome.Accepted, creation.Outcome);
        Assert.Null(creation.Item!.KeeperNotes);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_an_empty_or_blank_name_When_creating_Then_the_name_is_invalid_and_no_Item_is_created(string name)
    {
        var creation = Item.Create(CampaignId, name, Description, Notes, Now);

        Assert.Equal((ItemFieldsOutcome.InvalidName, null), (creation.Outcome, creation.Item));
    }

    [Fact]
    public void Given_names_around_200_characters_When_creating_Then_200_is_accepted_and_201_is_invalid()
    {
        Assert.Equal(ItemFieldsOutcome.Accepted, Item.Create(CampaignId, new string('a', 200), Description, null, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.Accepted, Item.Create(CampaignId, "  " + new string('a', 200) + "  ", Description, null, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.InvalidName, Item.Create(CampaignId, new string('a', 201), Description, null, Now).Outcome);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[]}]}}")]
    [InlineData("{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\" \"}]}]}}")]
    public void Given_a_missing_or_empty_description_When_creating_Then_the_description_is_missing(string? description)
    {
        var creation = Item.Create(CampaignId, "The cellar key", description, null, Now);

        Assert.Equal((ItemFieldsOutcome.MissingDescription, null), (creation.Outcome, creation.Item));
    }

    [Fact]
    public void Given_an_invalid_or_too_large_description_When_creating_Then_the_description_is_invalid()
    {
        var tooLarge = "{\"root\":{\"type\":\"root\",\"children\":[{\"type\":\"paragraph\",\"children\":[{\"type\":\"text\",\"text\":\""
            + new string('a', RichTextDocument.MaxBytes) + "\"}]}]}}";

        Assert.Equal(ItemFieldsOutcome.InvalidDescription, Item.Create(CampaignId, "Key", ImageNode, null, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.InvalidDescription, Item.Create(CampaignId, "Key", "not json", null, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.InvalidDescription, Item.Create(CampaignId, "Key", tooLarge, null, Now).Outcome);
    }

    [Fact]
    public void Given_invalid_Keeper_notes_When_creating_Then_the_notes_are_invalid()
    {
        Assert.Equal(ItemFieldsOutcome.InvalidKeeperNotes, Item.Create(CampaignId, "Key", Description, ImageNode, Now).Outcome);
    }

    [Fact]
    public void Given_several_invalid_fields_When_creating_Then_name_comes_before_description_before_notes()
    {
        Assert.Equal(ItemFieldsOutcome.InvalidName, Item.Create(CampaignId, "", null, ImageNode, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.MissingDescription, Item.Create(CampaignId, "Key", null, ImageNode, Now).Outcome);
        Assert.Equal(ItemFieldsOutcome.InvalidDescription, Item.Create(CampaignId, "Key", ImageNode, ImageNode, Now).Outcome);
    }

    [Fact]
    public void Given_Keeper_notes_with_no_visible_text_When_creating_Then_they_are_accepted()
    {
        Assert.Equal(ItemFieldsOutcome.Accepted, Item.Create(CampaignId, "Key", Description, Blank, Now).Outcome);
    }

    [Fact]
    public void Given_valid_fields_When_editing_Then_the_name_is_trimmed_and_all_three_fields_are_replaced()
    {
        var item = NewItem();

        var outcome = item.Edit("  The cellar key ", Notes, null);

        Assert.Equal(ItemFieldsOutcome.Accepted, outcome);
        Assert.Equal(("The cellar key", Notes, null), (item.Name, item.PlayerFacingDescription, item.KeeperNotes));
    }

    [Fact]
    public void Given_a_refused_edit_When_editing_Then_nothing_changes()
    {
        var item = NewItem();

        Assert.Equal(ItemFieldsOutcome.InvalidName, item.Edit("", Notes, Notes));
        Assert.Equal(ItemFieldsOutcome.MissingDescription, item.Edit("Other", Blank, Notes));
        Assert.Equal(ItemFieldsOutcome.InvalidDescription, item.Edit("Other", ImageNode, Notes));
        Assert.Equal(ItemFieldsOutcome.InvalidKeeperNotes, item.Edit("Other", Notes, ImageNode));

        Assert.Equal(("Walter Corbitt's diary", Description, Notes), (item.Name, item.PlayerFacingDescription, item.KeeperNotes));
    }
}
