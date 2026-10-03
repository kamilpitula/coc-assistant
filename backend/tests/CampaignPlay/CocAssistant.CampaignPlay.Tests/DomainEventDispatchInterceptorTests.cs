namespace CocAssistant.CampaignPlay.Tests;

public class DomainEventDispatchInterceptorTests : IDisposable
{
    private static readonly Guid KeeperAccountId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PlayerAccountId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid OtherPlayerAccountId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly SqliteCampaignPlayDbContextFixture _fixture = new();
    private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 10, 3, 12, 0, 0, TimeSpan.Zero));
    private readonly RecordingDomainEventDispatcher _dispatcher = new();

    private async Task<(Guid CampaignId, string Token)> CampaignWithActiveInviteAsync()
    {
        using var context = _fixture.CreateContext();
        var campaignId = (await new CampaignService(_fixture.CreateRepository(context), _timeProvider)
            .CreateCampaignAsync("The Haunting", KeeperAccountId, null, null, null, CancellationToken.None)).Id;
        var invite = await new CampaignMembershipService(_fixture.CreateRepository(context), _timeProvider)
            .IssueInviteAsync(campaignId, KeeperAccountId, CancellationToken.None);
        return (campaignId, invite!.Token);
    }

    private async Task JoinInOwnContextAsync(string token, Guid accountId)
    {
        using var context = _fixture.CreateContext();
        await new CampaignMembershipService(_fixture.CreateRepository(context), _timeProvider)
            .JoinAsync(token, accountId, CancellationToken.None);
    }

    private async Task<CampaignPlayer> PersistedPlayerAsync(Guid campaignId, Guid accountId)
    {
        using var context = _fixture.CreateContext();
        var campaign = await _fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None);
        return campaign!.Players.Single(player => player.AccountId == accountId);
    }

    [Fact]
    public async Task Given_an_active_invite_When_a_player_joins_and_the_save_commits_Then_one_player_joined_campaign_event_is_dispatched()
    {
        var (campaignId, token) = await CampaignWithActiveInviteAsync();
        using var context = _fixture.CreateContext(_dispatcher);

        await new CampaignMembershipService(_fixture.CreateRepository(context), _timeProvider)
            .JoinAsync(token, PlayerAccountId, CancellationToken.None);

        var player = await PersistedPlayerAsync(campaignId, PlayerAccountId);
        var dispatched = Assert.Single(_dispatcher.Dispatched);
        Assert.Equal(new PlayerJoinedCampaign(campaignId, player.Id, PlayerAccountId, _timeProvider.GetUtcNow()), dispatched);
    }

    [Fact]
    public async Task Given_a_competing_membership_change_When_the_save_fails_Then_nothing_is_dispatched()
    {
        var (campaignId, token) = await CampaignWithActiveInviteAsync();
        using var context = _fixture.CreateContext(_dispatcher);
        var campaign = await _fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None);
        campaign!.Join(PlayerAccountId, token, _timeProvider.GetUtcNow());
        await JoinInOwnContextAsync(token, OtherPlayerAccountId);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => context.SaveChangesAsync(CancellationToken.None));

        Assert.Empty(_dispatcher.Dispatches);
    }

    [Fact]
    public async Task Given_a_join_that_loses_a_race_When_the_service_retries_Then_only_the_committed_attempt_is_dispatched()
    {
        var (campaignId, token) = await CampaignWithActiveInviteAsync();
        using var context = _fixture.CreateContext(_dispatcher);
        var repository = new RacingCampaignRepository(
            _fixture.CreateRepository(context),
            () => JoinInOwnContextAsync(token, OtherPlayerAccountId));

        await new CampaignMembershipService(repository, _timeProvider).JoinAsync(token, PlayerAccountId, CancellationToken.None);

        Assert.Equal(2, repository.SaveAttempts);
        var player = await PersistedPlayerAsync(campaignId, PlayerAccountId);
        var dispatched = Assert.IsType<PlayerJoinedCampaign>(Assert.Single(_dispatcher.Dispatched));
        Assert.Equal(player.Id, dispatched.CampaignPlayerId);
    }

    [Fact]
    public async Task Given_dispatched_events_When_the_context_saves_again_Then_they_are_cleared_and_not_dispatched_twice()
    {
        var (campaignId, token) = await CampaignWithActiveInviteAsync();
        using var context = _fixture.CreateContext(_dispatcher);
        var campaign = await _fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None);
        campaign!.Join(PlayerAccountId, token, _timeProvider.GetUtcNow());
        await context.SaveChangesAsync(CancellationToken.None);

        await context.SaveChangesAsync(CancellationToken.None);

        Assert.Single(_dispatcher.Dispatched);
        Assert.Empty(campaign.DomainEvents);
    }

    [Fact]
    public async Task Given_a_pending_domain_event_When_saving_synchronously_Then_the_save_is_refused_before_commit()
    {
        var (campaignId, token) = await CampaignWithActiveInviteAsync();
        using var context = _fixture.CreateContext(_dispatcher);
        var campaign = await _fixture.CreateRepository(context).FindByIdAsync(campaignId, CancellationToken.None);
        campaign!.Join(PlayerAccountId, token, _timeProvider.GetUtcNow());

        Assert.Throws<InvalidOperationException>(() => context.SaveChanges());

        using var verifyContext = _fixture.CreateContext();
        var persisted = await _fixture.CreateRepository(verifyContext).FindByIdAsync(campaignId, CancellationToken.None);
        Assert.Empty(persisted!.Players);
        Assert.Empty(_dispatcher.Dispatches);
    }

    [Fact]
    public void Given_no_pending_domain_event_When_saving_synchronously_Then_the_save_succeeds()
    {
        using var context = _fixture.CreateContext(_dispatcher);
        context.Campaigns.Add(new Campaign("The Haunting", KeeperAccountId, _timeProvider.GetUtcNow()));

        var written = context.SaveChanges();

        Assert.Equal(1, written);
        Assert.Empty(_dispatcher.Dispatches);
    }

    public void Dispose() => _fixture.Dispose();
}
