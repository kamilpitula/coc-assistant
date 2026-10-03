namespace CocAssistant.CampaignPlay.Tests;

public class CampaignDomainEventTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 10, 3, 12, 0, 0, TimeSpan.Zero);
    private const string Token = "join-token";

    private static Campaign CampaignWithActiveInvite(int playerLimit = Campaign.DefaultPlayerLimit)
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, Now, playerLimit);
        campaign.IssueInvite(Token, Now);
        return campaign;
    }

    [Fact]
    public void Given_an_active_invite_When_an_account_joins_Then_exactly_one_player_joined_campaign_event_is_raised()
    {
        var campaign = CampaignWithActiveInvite();

        campaign.Join(PlayerAccountId, Token, Now);

        var raised = Assert.Single(campaign.DomainEvents);
        var player = Assert.Single(campaign.Players);
        Assert.Equal(new PlayerJoinedCampaign(campaign.Id, player.Id, PlayerAccountId, Now), raised);
    }

    [Fact]
    public void Given_an_existing_player_When_they_join_again_Then_no_further_event_is_raised()
    {
        var campaign = CampaignWithActiveInvite();
        campaign.Join(PlayerAccountId, Token, Now);
        campaign.ClearDomainEvents();

        var outcome = campaign.Join(PlayerAccountId, Token, Now);

        Assert.Equal(JoinCampaignOutcome.AlreadyMember, outcome);
        Assert.Empty(campaign.DomainEvents);
    }

    [Fact]
    public void Given_the_keeper_When_they_try_to_join_Then_no_event_is_raised()
    {
        var campaign = CampaignWithActiveInvite();

        var outcome = campaign.Join(KeeperAccountId, Token, Now);

        Assert.Equal(JoinCampaignOutcome.KeeperCannotJoin, outcome);
        Assert.Empty(campaign.DomainEvents);
    }

    [Fact]
    public void Given_a_revoked_invite_When_an_account_tries_to_join_Then_no_event_is_raised()
    {
        var campaign = CampaignWithActiveInvite();
        campaign.RevokeActiveInvite();

        var outcome = campaign.Join(PlayerAccountId, Token, Now);

        Assert.Equal(JoinCampaignOutcome.InvalidInvite, outcome);
        Assert.Empty(campaign.DomainEvents);
    }

    [Fact]
    public void Given_a_full_campaign_When_another_account_tries_to_join_Then_no_further_event_is_raised()
    {
        var campaign = CampaignWithActiveInvite(playerLimit: 1);
        campaign.Join(PlayerAccountId, Token, Now);
        campaign.ClearDomainEvents();

        var outcome = campaign.Join(Guid.Parse("33333333-3333-3333-3333-333333333333"), Token, Now);

        Assert.Equal(JoinCampaignOutcome.LimitReached, outcome);
        Assert.Empty(campaign.DomainEvents);
    }

    [Fact]
    public void Given_a_raised_event_When_events_are_cleared_Then_none_remain()
    {
        var campaign = CampaignWithActiveInvite();
        campaign.Join(PlayerAccountId, Token, Now);

        campaign.ClearDomainEvents();

        Assert.Empty(campaign.DomainEvents);
    }
}
