namespace CocAssistant.CampaignPlay.Tests;

public class CampaignJoinTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 9, 22, 12, 0, 0, TimeSpan.Zero);

    private static Campaign CampaignWithActiveInvite(out string token)
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, Now);
        token = "join-token";
        campaign.IssueInvite(token, Now);
        return campaign;
    }

    [Fact]
    public void Given_an_active_invite_When_an_account_joins_Then_it_becomes_a_player()
    {
        var campaign = CampaignWithActiveInvite(out var token);
        var accountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var outcome = campaign.Join(accountId, token, Now);

        Assert.Equal(JoinCampaignOutcome.Joined, outcome);
        Assert.Equal(1, campaign.PlayerCount);
        Assert.Contains(campaign.Players, player => player.AccountId == accountId);
    }

    [Fact]
    public void Given_a_revoked_invite_When_an_account_tries_to_join_Then_it_is_rejected()
    {
        var campaign = CampaignWithActiveInvite(out var token);
        campaign.RevokeActiveInvite();
        var accountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var outcome = campaign.Join(accountId, token, Now);

        Assert.Equal(JoinCampaignOutcome.InvalidInvite, outcome);
        Assert.Equal(0, campaign.PlayerCount);
    }

    [Fact]
    public void Given_a_replaced_invite_When_an_account_uses_the_old_token_Then_it_is_rejected()
    {
        var campaign = CampaignWithActiveInvite(out var oldToken);
        campaign.IssueInvite("new-token", Now);
        var accountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var outcome = campaign.Join(accountId, oldToken, Now);

        Assert.Equal(JoinCampaignOutcome.InvalidInvite, outcome);
        Assert.Equal(0, campaign.PlayerCount);
    }

    [Fact]
    public void Given_an_unknown_token_When_an_account_tries_to_join_Then_it_is_rejected()
    {
        var campaign = CampaignWithActiveInvite(out _);
        var accountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var outcome = campaign.Join(accountId, "wrong-token", Now);

        Assert.Equal(JoinCampaignOutcome.InvalidInvite, outcome);
    }

    [Fact]
    public void Given_the_keeper_When_they_try_to_join_their_own_campaign_Then_it_is_rejected()
    {
        var campaign = CampaignWithActiveInvite(out var token);

        var outcome = campaign.Join(KeeperAccountId, token, Now);

        Assert.Equal(JoinCampaignOutcome.KeeperCannotJoin, outcome);
        Assert.Equal(0, campaign.PlayerCount);
    }

    [Fact]
    public void Given_an_existing_player_When_they_try_to_join_again_Then_they_are_already_a_member()
    {
        var campaign = CampaignWithActiveInvite(out var token);
        var accountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        campaign.Join(accountId, token, Now);

        var outcome = campaign.Join(accountId, token, Now);

        Assert.Equal(JoinCampaignOutcome.AlreadyMember, outcome);
        Assert.Equal(1, campaign.PlayerCount);
    }

    [Fact]
    public void Given_a_campaign_at_its_player_limit_When_another_account_tries_to_join_Then_it_is_rejected()
    {
        var campaign = CampaignWithActiveInvite(out var token);
        for (var i = 0; i < Campaign.DefaultPlayerLimit; i++)
        {
            campaign.Join(Guid.NewGuid(), token, Now);
        }

        var outcome = campaign.Join(Guid.NewGuid(), token, Now);

        Assert.Equal(JoinCampaignOutcome.LimitReached, outcome);
        Assert.Equal(Campaign.DefaultPlayerLimit, campaign.PlayerCount);
    }

    [Fact]
    public void Given_a_new_campaign_When_created_Then_its_player_limit_is_the_default()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, Now);

        Assert.Equal(Campaign.DefaultPlayerLimit, campaign.PlayerLimit);
    }
}
