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
    public void Given_no_player_limit_When_creating_a_campaign_Then_it_admits_eight_players()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);

        Assert.Equal(8, campaign.PlayerLimit);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(16)]
    public void Given_a_configured_player_limit_When_creating_a_campaign_Then_it_keeps_that_limit(int playerLimit)
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt, playerLimit);

        Assert.Equal(playerLimit, campaign.PlayerLimit);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(17)]
    public void Given_an_out_of_range_player_limit_When_creating_a_campaign_Then_it_is_rejected(int playerLimit)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new Campaign("The Haunting", KeeperAccountId, CreatedAt, playerLimit));
    }

    [Fact]
    public void Given_a_campaign_with_a_limit_of_two_When_a_third_account_joins_Then_the_limit_is_reached()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt, playerLimit: 2);
        var invite = campaign.IssueInvite("token-1", CreatedAt);

        Assert.Equal(JoinCampaignOutcome.Joined, campaign.Join(Guid.NewGuid(), invite.Token, CreatedAt));
        Assert.Equal(JoinCampaignOutcome.Joined, campaign.Join(Guid.NewGuid(), invite.Token, CreatedAt));
        Assert.Equal(JoinCampaignOutcome.LimitReached, campaign.Join(Guid.NewGuid(), invite.Token, CreatedAt));
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
