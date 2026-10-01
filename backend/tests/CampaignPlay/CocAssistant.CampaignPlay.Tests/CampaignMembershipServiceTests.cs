namespace CocAssistant.CampaignPlay.Tests;

public class CampaignMembershipServiceTests : IDisposable
{
    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 9, 22, 12, 0, 0, TimeSpan.Zero));

    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private async Task<Guid> CreateCampaignAsync()
    {
        using var context = _fixture.CreateContext();
        var service = new CampaignService(_fixture.CreateRepository(context), _timeProvider);
        var campaign = await service.CreateCampaignAsync("The Haunting", KeeperAccountId, CancellationToken.None);
        return campaign.Id;
    }

    private CampaignMembershipService CreateMembershipService(CampaignPlayDbContext context) =>
        new(_fixture.CreateRepository(context), _timeProvider);

    [Fact]
    public async Task Given_a_keeper_When_issuing_an_invite_Then_it_is_persisted_as_the_active_invite()
    {
        var campaignId = await CreateCampaignAsync();

        string token;
        using (var context = _fixture.CreateContext())
        {
            var invite = await CreateMembershipService(context).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
            Assert.NotNull(invite);
            Assert.False(string.IsNullOrWhiteSpace(invite!.Token));
            token = invite.Token;
        }

        using var verifyContext = _fixture.CreateContext();
        var active = await CreateMembershipService(verifyContext).GetActiveInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        Assert.NotNull(active);
        Assert.Equal(token, active!.Token);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_issuing_an_invite_Then_nothing_is_issued()
    {
        var campaignId = await CreateCampaignAsync();

        using var context = _fixture.CreateContext();
        var invite = await CreateMembershipService(context).IssueInviteAsync(campaignId, PlayerAccountId, CancellationToken.None);

        Assert.Null(invite);
    }

    [Fact]
    public async Task Given_an_active_invite_When_issuing_again_Then_the_same_invite_is_returned()
    {
        var campaignId = await CreateCampaignAsync();
        string firstToken;
        using (var firstContext = _fixture.CreateContext())
        {
            firstToken = (await CreateMembershipService(firstContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }

        using var secondContext = _fixture.CreateContext();
        var second = await CreateMembershipService(secondContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);

        Assert.NotNull(second);
        Assert.Equal(firstToken, second!.Token);
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_replaces_it_Then_a_new_token_is_issued()
    {
        var campaignId = await CreateCampaignAsync();
        string firstToken;
        using (var firstContext = _fixture.CreateContext())
        {
            firstToken = (await CreateMembershipService(firstContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }

        string secondToken;
        using (var replaceContext = _fixture.CreateContext())
        {
            var replaced = await CreateMembershipService(replaceContext).ReplaceInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
            Assert.NotNull(replaced);
            secondToken = replaced!.Token;
        }

        Assert.NotEqual(firstToken, secondToken);

        using var verifyContext = _fixture.CreateContext();
        var active = await CreateMembershipService(verifyContext).GetActiveInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        Assert.Equal(secondToken, active!.Token);
    }

    [Fact]
    public async Task Given_a_non_keeper_When_replacing_an_invite_Then_nothing_is_issued()
    {
        var campaignId = await CreateCampaignAsync();

        using var context = _fixture.CreateContext();
        var replaced = await CreateMembershipService(context).ReplaceInviteAsync(campaignId, PlayerAccountId, CancellationToken.None);

        Assert.Null(replaced);
    }

    [Fact]
    public async Task Given_an_active_invite_When_the_keeper_revokes_it_Then_no_active_invite_remains()
    {
        var campaignId = await CreateCampaignAsync();
        using (var issueContext = _fixture.CreateContext())
        {
            await CreateMembershipService(issueContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        }

        using (var revokeContext = _fixture.CreateContext())
        {
            var outcome = await CreateMembershipService(revokeContext).RevokeInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
            Assert.Equal(RevokeInviteOutcome.Revoked, outcome);
        }

        using var verifyContext = _fixture.CreateContext();
        var active = await CreateMembershipService(verifyContext).GetActiveInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        Assert.Null(active);
    }

    [Fact]
    public async Task Given_an_active_invite_When_an_account_joins_Then_it_becomes_a_persisted_player()
    {
        var campaignId = await CreateCampaignAsync();
        string token;
        using (var issueContext = _fixture.CreateContext())
        {
            token = (await CreateMembershipService(issueContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }

        using (var joinContext = _fixture.CreateContext())
        {
            var result = await CreateMembershipService(joinContext).JoinAsync(token, PlayerAccountId, CancellationToken.None);
            Assert.Equal(JoinCampaignOutcome.Joined, result.Outcome);
            Assert.False(result.Conflict);
            Assert.Equal(campaignId, result.Campaign!.Id);
        }

        using var verifyContext = _fixture.CreateContext();
        var campaign = await verifyContext.Campaigns.Include(c => c.Players).SingleAsync(c => c.Id == campaignId);
        Assert.Contains(campaign.Players, player => player.AccountId == PlayerAccountId);
    }

    [Fact]
    public async Task Given_a_revoked_invite_When_an_account_tries_to_join_Then_it_is_rejected()
    {
        var campaignId = await CreateCampaignAsync();
        string token;
        using (var issueContext = _fixture.CreateContext())
        {
            token = (await CreateMembershipService(issueContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }
        using (var revokeContext = _fixture.CreateContext())
        {
            await CreateMembershipService(revokeContext).RevokeInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        }

        using var joinContext = _fixture.CreateContext();
        var result = await CreateMembershipService(joinContext).JoinAsync(token, PlayerAccountId, CancellationToken.None);

        Assert.Equal(JoinCampaignOutcome.InvalidInvite, result.Outcome);
    }

    [Fact]
    public async Task Given_a_campaign_at_its_limit_When_another_account_joins_Then_it_is_rejected()
    {
        var campaignId = await CreateCampaignAsync();
        string token;
        using (var issueContext = _fixture.CreateContext())
        {
            token = (await CreateMembershipService(issueContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }

        for (var i = 0; i < Campaign.DefaultPlayerLimit; i++)
        {
            using var joinContext = _fixture.CreateContext();
            var joined = await CreateMembershipService(joinContext).JoinAsync(token, Guid.NewGuid(), CancellationToken.None);
            Assert.Equal(JoinCampaignOutcome.Joined, joined.Outcome);
        }

        using var overLimitContext = _fixture.CreateContext();
        var result = await CreateMembershipService(overLimitContext).JoinAsync(token, Guid.NewGuid(), CancellationToken.None);

        Assert.Equal(JoinCampaignOutcome.LimitReached, result.Outcome);
    }

    [Fact]
    public async Task Given_one_open_slot_When_two_accounts_join_concurrently_Then_only_one_is_admitted()
    {
        var campaignId = await CreateCampaignAsync();
        string token;
        using (var issueContext = _fixture.CreateContext())
        {
            token = (await CreateMembershipService(issueContext).IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None))!.Token;
        }

        // Fill every slot but the last.
        for (var i = 0; i < Campaign.DefaultPlayerLimit - 1; i++)
        {
            using var joinContext = _fixture.CreateContext();
            await CreateMembershipService(joinContext).JoinAsync(token, Guid.NewGuid(), CancellationToken.None);
        }

        // Two contexts load the same aggregate before either persists, then both try to take the last slot.
        using var contextA = _fixture.CreateContext();
        using var contextB = _fixture.CreateContext();
        var campaignA = await contextA.Campaigns.Include(c => c.Players).Include(c => c.Invites).SingleAsync(c => c.Id == campaignId);
        var campaignB = await contextB.Campaigns.Include(c => c.Players).Include(c => c.Invites).SingleAsync(c => c.Id == campaignId);

        Assert.Equal(JoinCampaignOutcome.Joined, campaignA.Join(Guid.NewGuid(), token, _timeProvider.GetUtcNow()));
        Assert.Equal(JoinCampaignOutcome.Joined, campaignB.Join(Guid.NewGuid(), token, _timeProvider.GetUtcNow()));

        await contextA.SaveChangesAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => contextB.SaveChangesAsync());

        using var verifyContext = _fixture.CreateContext();
        var stored = await verifyContext.Campaigns.Include(c => c.Players).SingleAsync(c => c.Id == campaignId);
        Assert.Equal(Campaign.DefaultPlayerLimit, stored.Players.Count);
    }

    public void Dispose() => _fixture.Dispose();
}
