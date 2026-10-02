namespace CocAssistant.CampaignPlay.Tests;

/// <summary>Campaign rules options and membership (specs/campaign-play/spec.md, "Campaign rules options").</summary>
public class CampaignRulesOptionsTests
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 2, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Given_no_rules_options_When_creating_a_campaign_Then_it_uses_the_1920s_and_all_creation_methods()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);

        Assert.Equal(Era.The1920s, campaign.Era);
        Assert.Equal(AllowedCreationMethods.All, campaign.AllowedCreationMethods);
    }

    [Fact]
    public void Given_chosen_creation_methods_When_creating_a_campaign_Then_it_keeps_them()
    {
        var pointBuyOnly = AllowedCreationMethods.Create([CreationMethod.PointBuy]);

        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt, era: Era.The1920s, allowedCreationMethods: pointBuyOnly);

        Assert.Equal(pointBuyOnly, campaign.AllowedCreationMethods);
    }

    [Fact]
    public void Given_a_campaign_When_the_keeper_changes_the_allowed_creation_methods_Then_they_are_replaced()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);
        var quickFireOnly = AllowedCreationMethods.Create([CreationMethod.QuickFire]);

        campaign.ChangeAllowedCreationMethods(quickFireOnly);

        Assert.Equal(quickFireOnly, campaign.AllowedCreationMethods);
        Assert.Equal(Era.The1920s, campaign.Era);
    }

    [Fact]
    public void Given_a_campaign_with_a_player_When_asked_about_membership_Then_the_keeper_and_player_are_members_and_others_are_not()
    {
        var campaign = new Campaign("The Haunting", KeeperAccountId, CreatedAt);
        var invite = campaign.IssueInvite("token-1", CreatedAt);
        var playerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        campaign.Join(playerAccountId, invite.Token, CreatedAt);

        Assert.True(campaign.IsMember(KeeperAccountId));
        Assert.True(campaign.IsMember(playerAccountId));
        Assert.False(campaign.IsMember(Guid.Parse("33333333-3333-3333-3333-333333333333")));
        Assert.False(campaign.IsMember(Guid.Empty));
    }
}
