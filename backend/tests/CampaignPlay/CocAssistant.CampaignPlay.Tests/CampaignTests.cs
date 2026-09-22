namespace CocAssistant.CampaignPlay.Tests;

public class CampaignTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset CreatedAt = new(2026, 9, 22, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Given_a_keeper_and_a_name_When_creating_a_campaign_Then_the_keeper_owns_it()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);

        Assert.NotEqual(Guid.Empty, campaign.Id);
        Assert.Equal("The Haunting", campaign.Name);
        Assert.Equal(KeeperAccountId, campaign.KeeperAccountId);
        Assert.Equal(CreatedAt, campaign.CreatedAt);
    }

    [Fact]
    public void Given_a_blank_name_When_creating_a_campaign_Then_it_is_rejected()
    {
        Assert.Throws<ArgumentException>(() => new Campaign("   ", KeeperAccountId, CreatedAt));
    }

    [Fact]
    public void Given_an_empty_keeper_When_creating_a_campaign_Then_it_is_rejected()
    {
        Assert.Throws<ArgumentException>(() => new Campaign("The Haunting", Guid.Empty, CreatedAt));
    }

    [Fact]
    public void Given_a_campaign_When_asked_about_its_keeper_Then_only_the_owning_account_is_the_keeper()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);
        var otherAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        Assert.True(campaign.IsKeeper(KeeperAccountId));
        Assert.False(campaign.IsKeeper(otherAccountId));
    }
}
