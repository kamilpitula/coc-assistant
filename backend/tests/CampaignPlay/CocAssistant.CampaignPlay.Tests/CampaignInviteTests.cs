namespace CocAssistant.CampaignPlay.Tests;

public class CampaignInviteTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 9, 22, 12, 0, 0, TimeSpan.Zero);

    private static Campaign NewCampaign() => new("The Haunting", KeeperAccountId, Now);

    [Fact]
    public void Given_a_campaign_When_the_keeper_issues_an_invite_Then_it_becomes_the_active_invite()
    {
        var campaign = NewCampaign();

        var invite = campaign.IssueInvite("token-1", Now);

        Assert.Equal(CampaignInviteStatus.Active, invite.Status);
        Assert.Equal("token-1", invite.Token);
        Assert.Same(invite, campaign.ActiveInvite);
    }

    [Fact]
    public void Given_an_active_invite_When_the_keeper_issues_another_Then_the_previous_is_replaced()
    {
        var campaign = NewCampaign();
        var first = campaign.IssueInvite("token-1", Now);

        var second = campaign.IssueInvite("token-2", Now);

        Assert.Equal(CampaignInviteStatus.Replaced, first.Status);
        Assert.Equal(CampaignInviteStatus.Active, second.Status);
        Assert.Same(second, campaign.ActiveInvite);
    }

    [Fact]
    public void Given_an_active_invite_When_the_keeper_revokes_it_Then_there_is_no_active_invite()
    {
        var campaign = NewCampaign();
        var invite = campaign.IssueInvite("token-1", Now);

        var revoked = campaign.RevokeActiveInvite();

        Assert.True(revoked);
        Assert.Equal(CampaignInviteStatus.Revoked, invite.Status);
        Assert.Null(campaign.ActiveInvite);
    }

    [Fact]
    public void Given_no_active_invite_When_revoking_Then_nothing_is_revoked()
    {
        var campaign = NewCampaign();

        var revoked = campaign.RevokeActiveInvite();

        Assert.False(revoked);
        Assert.Null(campaign.ActiveInvite);
    }

    [Fact]
    public void Given_a_blank_token_When_issuing_an_invite_Then_it_is_rejected()
    {
        var campaign = NewCampaign();

        Assert.Throws<ArgumentException>(() => campaign.IssueInvite("   ", Now));
    }
}
